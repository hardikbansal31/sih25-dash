// import express from "express";
// import multer from "multer";
// import { exec } from "child_process";
// import fs from "fs";
// import path from "path";
// import mysql from "mysql2";
// import cors from "cors";

// const app = express();
// const PORT = 5000;

// // Enable CORS for frontend
// app.use(cors());

// // Setup storage for uploaded files
// const upload = multer({ dest: "uploads/" });

// // Ensure compressed directory exists
// const compressedDir = path.join(process.cwd(), "compressed");
// if (!fs.existsSync(compressedDir)) {
//   fs.mkdirSync(compressedDir);
// }

// // MySQL connection
// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "@Hardik30",
//   database: "videodb",
// });

// db.connect((err) => {
//   if (err) {
//     console.error("MySQL connection failed:", err);
//   } else {
//     console.log("Connected to MySQL");
//   }
// });

// // Upload & compress route
// app.post("/upload", upload.single("video"), (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ error: "No file uploaded" });
//   }

//   const inputPath = req.file.path;
//   const outputFilename = `${Date.now()}-compressed.mp4`;
//   const outputPath = path.join(compressedDir, outputFilename);

//   // FFmpeg command: H.264 ultrafast + Opus audio
//   const cmd = `ffmpeg -y -i "${inputPath}" -c:v libx264 -preset ultrafast -crf 28 -vf scale=-2:720 -c:a libopus "${outputPath}"`;

//   exec(cmd, (error, stdout, stderr) => {
//     // Delete the original uploaded file
//     fs.unlink(inputPath, () => {});

//     if (error) {
//       console.error("FFmpeg error:", error);
//       return res.status(500).json({ error: "Compression failed" });
//     }

//     // Save metadata in DB
//     const sql = "INSERT INTO videos (filename, path) VALUES (?, ?)";
//     db.query(sql, [outputFilename, outputPath], (err) => {
//       if (err) {
//         console.error("DB insert error:", err);
//         return res.status(500).json({ error: "Database insert failed" });
//       }
//       res.json({
//         message: "Video uploaded & compressed",
//         filename: outputFilename,
//       });
//     });
//   });
// });

// // Serve compressed videos
// app.use("/videos", express.static(compressedDir));

// // Get list of videos
// app.get("/videos", (req, res) => {
//   const sql = "SELECT id, filename FROM videos";
//   db.query(sql, (err, results) => {
//     if (err) {
//       console.error("DB query error:", err);
//       return res.status(500).json({ error: "Failed to fetch videos" });
//     }
//     res.json(results);
//   });
// });

// // server.js

// // ... after your other routes

// app.get("/stream/:filename", (req, res) => {
//   const { filename } = req.params;
//   const videoPath = path.join(compressedDir, filename);

//   if (!fs.existsSync(videoPath)) {
//     return res.status(404).send("Video not found");
//   }

//   const videoStat = fs.statSync(videoPath);
//   const fileSize = videoStat.size;
//   const range = req.headers.range;

//   if (range) {
//     const parts = range.replace(/bytes=/, "").split("-");
//     const start = parseInt(parts[0], 10);
//     const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

//     const chunksize = end - start + 1;
//     const file = fs.createReadStream(videoPath, { start, end });
//     const head = {
//       "Content-Range": `bytes ${start}-${end}/${fileSize}`,
//       "Accept-Ranges": "bytes",
//       "Content-Length": chunksize,
//       "Content-Type": "video/mp4",
//     };

//     res.writeHead(206, head); // 206 Partial Content
//     file.pipe(res);
//   } else {
//     const head = {
//       "Content-Length": fileSize,
//       "Content-Type": "video/mp4",
//     };
//     res.writeHead(200, head); // 200 OK
//     fs.createReadStream(videoPath).pipe(res);
//   }
// });

// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });

import express from "express";
import multer from "multer";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import mysql from "mysql2";
import cors from "cors";

const app = express();
const PORT = 5000;

// Enable CORS
app.use(cors());

// Multer for uploads
const upload = multer({ dest: "uploads/" });

// Ensure compressed directory exists
const compressedDir = path.join(process.cwd(), "compressed");
if (!fs.existsSync(compressedDir)) fs.mkdirSync(compressedDir);

// MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "@Hardik30",
  database: "newVid",
});

db.connect((err) => {
  if (err) console.error("MySQL connection failed:", err);
  else console.log("Connected to MySQL");
});

// Resolutions & CRF values for VP9
const resolutions = [720, 480, 360];
const crfs = { 720: 32, 480: 34, 360: 36 }; // higher CRF → smaller file

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
                new Error(`FFmpeg exited with code ${code} for ${res}p`)
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

// Upload route
app.post("/upload", upload.single("video"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const versions = await compressVideoVP9(req.file.path);

    // Insert original video metadata
    db.query(
      "INSERT INTO videos (original_filename) VALUES (?)",
      [req.file.originalname],
      (err, result) => {
        if (err) return res.status(500).json({ error: "DB insert failed" });

        const videoId = result.insertId;

        // Insert all versions
        versions.forEach((v) => {
          db.query(
            "INSERT INTO video_versions (video_id, filename, path, resolution) VALUES (?, ?, ?, ?)",
            [videoId, v.filename, v.path, v.resolution],
            (err) => {
              if (err) console.error("Version insert error:", err);
            }
          );
        });

        res.json({ message: "Video uploaded & compressed", versions });
      }
    );
  } catch (err) {
    console.error("Compression error:", err);
    res.status(500).json({ error: "Compression failed" });
  }
});

// Get all videos with versions
app.get("/videos", (req, res) => {
  const sql = `
    SELECT v.id as video_id, v.original_filename, vv.id as version_id, vv.filename, vv.resolution
    FROM videos v
    JOIN video_versions vv ON v.id = vv.video_id
    ORDER BY v.uploaded_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch videos" });

    // Group versions by video
    const grouped = results.reduce((acc, v) => {
      if (!acc[v.video_id])
        acc[v.video_id] = {
          id: v.video_id,
          original_filename: v.original_filename,
          versions: [],
        };
      acc[v.video_id].versions.push({
        id: v.version_id,
        filename: v.filename,
        resolution: v.resolution,
      });
      return acc;
    }, {});

    res.json(Object.values(grouped));
  });
});

// Stream videos with Range support
app.get("/stream/:filename", (req, res) => {
  const { filename } = req.params;
  const videoPath = path.join(compressedDir, filename);

  if (!fs.existsSync(videoPath)) return res.status(404).send("Video not found");

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/webm",
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/webm",
    });
    fs.createReadStream(videoPath).pipe(res);
  }
});

// Optional static serving
app.use("/videos/static", express.static(compressedDir));

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
