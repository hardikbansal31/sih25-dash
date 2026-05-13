import { Worker } from "bullmq";
import { connection } from "./queueSetup.js";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import "dotenv/config";
import mysql from "mysql2/promise";

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "dashuser",
  password: process.env.DB_PASSWORD || "mypassword",
  database: process.env.DB_NAME || "vid",
});

const compressedDir = path.join(process.cwd(), "compressed");

// ── HLS config ────────────────────────────────────────────────────────────────
//
// For each rendition we pass FFmpeg a set of video/audio encoding params.
// HLS_SEGMENT_DURATION controls how many seconds each .ts chunk covers —
// 4s is a good balance between seek accuracy and request overhead.
//
// Why H.264 + AAC for HLS instead of VP9 + Opus?
// H.264 is natively supported by every browser, iOS, and Android without
// a JS decoder. VP9 requires hls.js to use MSE which in turn requires
// software decode on many devices. For a portfolio project you want maximum
// compatibility and zero "it won't play on my phone" moments.

const HLS_SEGMENT_DURATION = 4;

const RENDITIONS = [
  // { label, height, videoBitrate, audioBitrate, crf }
  // Lower CRF = better quality. 23 is visually transparent for 720p.
  {
    label: "720p",
    height: 720,
    videoBitrate: "2800k",
    audioBitrate: "128k",
    crf: 23,
  },
  {
    label: "480p",
    height: 480,
    videoBitrate: "1400k",
    audioBitrate: "96k",
    crf: 25,
  },
  {
    label: "360p",
    height: 360,
    videoBitrate: "800k",
    audioBitrate: "64k",
    crf: 28,
  },
];

// ── Encode one rendition to HLS ───────────────────────────────────────────────
//
// Produces:
//   <outputDir>/<label>.m3u8        — rendition playlist
//   <outputDir>/<label>_seg%03d.ts  — numbered segment files
//
// Progress is reported as a fraction of this rendition's share of the overall
// job. progressBase and progressStep come from the caller.

function encodeRendition(
  inputPath,
  outputDir,
  rendition,
  job,
  progressBase,
  progressStep,
) {
  return new Promise((resolve, reject) => {
    const { label, height, videoBitrate, audioBitrate, crf } = rendition;

    const playlistPath = path.join(outputDir, `${label}.m3u8`);
    const segmentPattern = path.join(outputDir, `${label}_seg%03d.ts`);

    const args = [
      "-y",
      "-i",
      inputPath,

      // Video: H.264, constrained by both CRF quality floor and a peak bitrate cap
      "-c:v",
      "libx264",
      "-crf",
      String(crf),
      "-maxrate",
      videoBitrate,
      "-bufsize",
      videoBitrate, // VBV buffer = 1× maxrate is standard
      "-vf",
      `scale=-2:${height}`,
      "-preset",
      "fast", // fast = good speed/compression tradeoff
      "-profile:v",
      "main", // broadest device compatibility
      "-level",
      "3.1",

      // Audio: AAC stereo
      "-c:a",
      "aac",
      "-b:a",
      audioBitrate,
      "-ac",
      "2",

      // HLS muxer options
      "-f",
      "hls",
      "-hls_time",
      String(HLS_SEGMENT_DURATION),
      "-hls_playlist_type",
      "vod", // VOD = all segments listed upfront
      "-hls_segment_filename",
      segmentPattern,
      "-hls_flags",
      "independent_segments", // each segment decodable on its own

      playlistPath,
    ];

    let durationSecs = null;
    const ffmpeg = spawn("ffmpeg", args);

    ffmpeg.stderr.on("data", (data) => {
      const text = data.toString();

      if (durationSecs === null) {
        const m = text.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
        if (m) {
          durationSecs =
            parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
        }
      }

      if (durationSecs) {
        const m = text.match(/time=(\d+):(\d+):([\d.]+)/);
        if (m) {
          const current =
            parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
          const fraction = Math.min(current / durationSecs, 1);
          const overall = Math.round(progressBase + fraction * progressStep);
          job.updateProgress(overall).catch(() => {});
        }
      }
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) resolve(playlistPath);
      else reject(new Error(`FFmpeg exited with code ${code} for ${label}`));
    });

    ffmpeg.on("error", (err) => reject(err));
  });
}

// ── Build master playlist ─────────────────────────────────────────────────────
//
// The master playlist tells hls.js about all available renditions.
// Browsers use the BANDWIDTH hint to pick the right one automatically.
// URI paths are relative so they work regardless of where the server
// serves the files from.

function writeMasterPlaylist(outputDir) {
  const lines = ["#EXTM3U", "#EXT-X-VERSION:3", ""];

  RENDITIONS.forEach(({ label, height, videoBitrate, audioBitrate }) => {
    // Convert bitrate strings like "2800k" to numeric bytes/sec for the manifest
    const vbps = parseInt(videoBitrate) * 1000;
    const abps = parseInt(audioBitrate) * 1000;
    const bandwidth = vbps + abps;
    const resolution = `${Math.round((height * 16) / 9)}x${height}`; // 16:9 assumption

    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution}`,
    );
    lines.push(`${label}.m3u8`);
    lines.push("");
  });

  const masterPath = path.join(outputDir, "master.m3u8");
  fs.writeFileSync(masterPath, lines.join("\n"));
  return masterPath;
}

// ── Worker ────────────────────────────────────────────────────────────────────

const worker = new Worker(
  "video-compression",
  async (job) => {
    const { videoId, inputPath } = job.data;
    console.log(`[Job ${job.id}] Processing video ${videoId}…`);

    await job.updateProgress(0);

    // Each video gets its own output directory: compressed/<videoId>/
    const outputDir = path.join(compressedDir, String(videoId));
    fs.mkdirSync(outputDir, { recursive: true });

    const stepSize = Math.floor(100 / RENDITIONS.length); // 33 per rendition

    for (let i = 0; i < RENDITIONS.length; i++) {
      const rendition = RENDITIONS[i];
      const progressBase = i * stepSize;

      console.log(`[Job ${job.id}] Encoding ${rendition.label}…`);
      await encodeRendition(
        inputPath,
        outputDir,
        rendition,
        job,
        progressBase,
        stepSize,
      );

      await job.updateProgress(progressBase + stepSize); // snap to milestone
    }

    // Write the master playlist that references all three rendition playlists
    const masterPath = writeMasterPlaylist(outputDir);

    // Store the relative path (relative to compressedDir) in the DB
    const relativeMasterPath = path.relative(compressedDir, masterPath);

    await db.query(
      "INSERT INTO video_versions (video_id, master_path) VALUES (?, ?)",
      [videoId, relativeMasterPath],
    );

    fs.unlink(inputPath, () => {});
    await job.updateProgress(100);

    console.log(`[Job ${job.id}] Done. HLS output: ${outputDir}`);
    return { masterPath: relativeMasterPath };
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
