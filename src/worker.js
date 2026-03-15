import { Worker } from "bullmq";
import { connection } from "./queueSetup.js";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";

// ── DB ────────────────────────────────────────────────────────────────────────

const db = await mysql.createConnection({
  host: "localhost",
  user: "dashuser",
  password: "mypassword",
  database: "vid",
});

const compressedDir = path.join(process.cwd(), "compressed");

// ── Compression ───────────────────────────────────────────────────────────────

const resolutions = [720, 480, 360];
const crfs = { 720: 32, 480: 34, 360: 36 };

function compressVideoVP9(inputPath) {
  return new Promise((resolve, reject) => {
    const versions = [];
    let chain = Promise.resolve();

    resolutions.forEach((res) => {
      chain = chain.then(
        () =>
          new Promise((resPromise, rejPromise) => {
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

            const ffmpeg = spawn("ffmpeg", args);

            ffmpeg.stderr.on("data", (data) => {
              console.log(`FFmpeg [${res}p]: ${data.toString()}`);
            });

            ffmpeg.on("close", (code) => {
              if (code === 0) {
                versions.push({
                  resolution: res,
                  filename: outputFilename,
                  path: outputPath,
                });
                resPromise();
              } else {
                rejPromise(
                  new Error(`FFmpeg exited with code ${code} for ${res}p`),
                );
              }
            });

            ffmpeg.on("error", (err) => rejPromise(err));
          }),
      );
    });

    chain
      .then(() => {
        fs.unlink(inputPath, () => {});
        resolve(versions);
      })
      .catch((err) => {
        fs.unlink(inputPath, () => {});
        reject(err);
      });
  });
}

// ── Worker ────────────────────────────────────────────────────────────────────

const worker = new Worker(
  "video-compression",
  async (job) => {
    console.log(`[Job ${job.id}] Processing video ${job.data.videoId}…`);

    const versions = await compressVideoVP9(job.data.inputPath);

    for (const v of versions) {
      await db.query(
        "INSERT INTO video_versions (video_id, filename, resolution) VALUES (?, ?, ?)",
        [job.data.videoId, v.filename, v.resolution],
      );
    }

    console.log(`[Job ${job.id}] Done — ${versions.length} versions saved.`);
    return versions;
  },
  {
    connection,
    // Don't pick up more than 1 job at a time — FFmpeg is already maxing CPU
    concurrency: 1,
  },
);

worker.on("failed", (job, err) => {
  console.error(
    `[Job ${job.id}] Failed (attempt ${job.attemptsMade}): ${err.message}`,
  );
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
// When the process receives SIGTERM or SIGINT (Ctrl+C, Docker stop, PM2 reload):
// 1. Stop accepting new jobs immediately
// 2. Wait for any in-progress job to finish (or be re-queued by BullMQ)
// 3. Close the DB connection cleanly
// Without this, an in-progress FFmpeg encode gets orphaned: the partial .webm
// sits on disk, the job stays "active" in Redis forever, and it never retries.

async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down worker gracefully…`);

  try {
    // worker.close() waits for the current job to complete before stopping.
    // Pass `true` to force-close immediately if you'd rather re-queue.
    await worker.close();
    console.log("Worker closed.");

    await db.end();
    console.log("DB connection closed.");

    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

console.log("Worker running — listening for jobs…");