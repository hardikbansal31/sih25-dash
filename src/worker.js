import { Worker } from "bullmq";
import { connection } from "./queueSetup.js";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise"; // Using promises for cleaner async code here

// 1. Setup DB for the worker
const db = await mysql.createConnection({
  host: "localhost",
  user: "dashuser",
  password: "mypassword",
  database: "vid",
});

const compressedDir = path.join(process.cwd(), "compressed");

// (Paste your existing compressVideoVP9 function here)
// Compress a video using VP9 + Opus with CRF + show real-time logs
function compressVideoVP9(inputPath) {
  return new Promise((resolve, reject) => {
    const versions = [];

    let chain = Promise.resolve();

    resolutions.forEach((res) => {
      chain = chain.then(() => {
        return new Promise((resPromise, rejPromise) => {
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
            "0", // CRF mode requires -b:v 0
            "-vf",
            `scale=-2:${res}`,
            "-c:a",
            "libopus",
            "-b:a",
            "64k", // reduce audio bitrate to save size
            outputPath,
          ];

          const ffmpeg = spawn("ffmpeg", args);

          ffmpeg.stdout.on("data", (data) => {
            console.log(`FFmpeg stdout [${res}p]: ${data.toString()}`);
          });

          ffmpeg.stderr.on("data", (data) => {
            console.log(`FFmpeg log [${res}p]: ${data.toString()}`);
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
        });
      });
    });

    chain
      .then(() => {
        // Delete original uploaded file
        fs.unlink(inputPath, () => {});
        resolve(versions);
      })
      .catch((err) => {
        fs.unlink(inputPath, () => {});
        reject(err);
      });
  });
}
// function compressVideoVP9(inputPath) { ... }

// 2. Initialize the Worker
const worker = new Worker(
  "video-compression",
  async (job) => {
    console.log(
      `[Job ${job.id}] Picked up video ${job.data.videoId} for compression...`,
    );

    try {
      // Run the heavy FFmpeg process
      const versions = await compressVideoVP9(job.data.inputPath);

      // Save the generated versions to the database
      for (const v of versions) {
        await db.query(
          "INSERT INTO video_versions (video_id, filename, path, resolution) VALUES (?, ?, ?, ?)",
          [job.data.videoId, v.filename, v.path, v.resolution],
        );
      }

      console.log(
        `[Job ${job.id}] Successfully compressed video ${job.data.videoId}`,
      );
      return versions;
    } catch (error) {
      console.error(`[Job ${job.id}] Failed:`, error);
      throw error; // Let BullMQ know this job failed so it can retry if configured
    }
  },
  { connection },
);

worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed with error ${err.message}`);
});

console.log("Worker is running and listening for jobs...");
