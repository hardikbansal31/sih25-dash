import { Worker } from "bullmq";
import { connection } from "./queueSetup.js";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";

const db = await mysql.createConnection({
  host: "localhost",
  user: "dashuser",
  password: "mypassword",
  database: "vid",
});

const compressedDir = path.join(process.cwd(), "compressed");

const resolutions = [720, 480, 360];
const crfs = { 720: 32, 480: 34, 360: 36 };

// Compresses one resolution, parsing FFmpeg stderr for real-time progress.
// progressBase = overall % before this resolution starts (0, 33, 66)
// progressStep = how much this resolution contributes to overall (33)
function compressOneResolution(
  inputPath,
  res,
  job,
  progressBase,
  progressStep,
) {
  return new Promise((resolve, reject) => {
    const outputFilename = `${Date.now()}-${res}p.webm`;
    const outputPath = path.join(compressedDir, outputFilename);

    const args = [
      "-y",
      "-i",
      inputPath,
      "-c:v",
      "libvpx-vp9",
      "-crf",
      crfs[res],
      "-b:v",
      "0",
      "-vf",
      `scale=-2:${res}`,
      "-c:a",
      "libopus",
      "-b:a",
      "64k",
      outputPath,
    ];

    let durationSecs = null;
    const ffmpeg = spawn("ffmpeg", args);

    ffmpeg.stderr.on("data", (data) => {
      const text = data.toString();

      // Grab total duration once from the header block
      if (durationSecs === null) {
        const m = text.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
        if (m) {
          durationSecs =
            parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
        }
      }

      // Map current encode time → overall job progress
      if (durationSecs) {
        const m = text.match(/time=(\d+):(\d+):([\d.]+)/);
        if (m) {
          const currentSecs =
            parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
          const fraction = Math.min(currentSecs / durationSecs, 1);
          const overall = Math.round(progressBase + fraction * progressStep);
          // Fire-and-forget — don't let a Redis hiccup fail the encode
          job.updateProgress(overall).catch(() => {});
        }
      }
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve({
          resolution: res,
          filename: outputFilename,
          path: outputPath,
        });
      } else {
        reject(new Error(`FFmpeg exited with code ${code} for ${res}p`));
      }
    });

    ffmpeg.on("error", (err) => reject(err));
  });
}

// ── Worker ────────────────────────────────────────────────────────────────────

const worker = new Worker(
  "video-compression",
  async (job) => {
    console.log(`[Job ${job.id}] Processing video ${job.data.videoId}…`);

    await job.updateProgress(0);

    const versions = [];
    const stepSize = Math.floor(100 / resolutions.length); // 33 each

    for (let i = 0; i < resolutions.length; i++) {
      const res = resolutions[i];
      const progressBase = i * stepSize;

      console.log(`[Job ${job.id}] Encoding ${res}p (base ${progressBase}%)…`);

      const version = await compressOneResolution(
        job.data.inputPath,
        res,
        job,
        progressBase,
        stepSize,
      );
      versions.push(version);

      // Snap to a clean milestone once each resolution finishes
      await job.updateProgress(progressBase + stepSize);
    }

    for (const v of versions) {
      await db.query(
        "INSERT INTO video_versions (video_id, filename, resolution) VALUES (?, ?, ?)",
        [job.data.videoId, v.filename, v.resolution],
      );
    }

    fs.unlink(job.data.inputPath, () => {});
    await job.updateProgress(100);

    console.log(`[Job ${job.id}] Done.`);
    return versions;
  },
  { connection, concurrency: 1 },
);

worker.on("failed", (job, err) => {
  console.error(
    `[Job ${job.id}] Failed (attempt ${job.attemptsMade}): ${err.message}`,
  );
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────

async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down worker gracefully…`);
  try {
    await worker.close();
    await db.end();
    process.exit(0);
  } catch (err) {
    console.error("Shutdown error:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

console.log("Worker running — listening for jobs…");
