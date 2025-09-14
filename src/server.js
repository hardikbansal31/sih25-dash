import express from "express";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import mysql from "mysql2";
import cors from "cors";

const app = express();
const PORT = 5000;

// Enable CORS for frontend
app.use(cors());

// Setup storage for uploaded files
const upload = multer({ dest: "uploads/" });

// Ensure compressed directory exists
const compressedDir = path.join(process.cwd(), "compressed");
if (!fs.existsSync(compressedDir)) {
  fs.mkdirSync(compressedDir);
}

// MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "@Hardik30",
  database: "videodb",
});

db.connect((err) => {
  if (err) {
    console.error("MySQL connection failed:", err);
  } else {
    console.log("Connected to MySQL");
  }
});

// Upload & compress route
app.post("/upload", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const inputPath = req.file.path;
  const outputFilename = `${Date.now()}-compressed.mp4`;
  const outputPath = path.join(compressedDir, outputFilename);

  // FFmpeg command: H.264 ultrafast + Opus audio
  const cmd = `ffmpeg -y -i "${inputPath}" -c:v libx264 -preset ultrafast -crf 28 -vf scale=-2:720 -c:a libopus "${outputPath}"`;

  exec(cmd, (error, stdout, stderr) => {
    // Delete the original uploaded file
    fs.unlink(inputPath, () => {});

    if (error) {
      console.error("FFmpeg error:", error);
      return res.status(500).json({ error: "Compression failed" });
    }

    // Save metadata in DB
    const sql = "INSERT INTO videos (filename, path) VALUES (?, ?)";
    db.query(sql, [outputFilename, outputPath], (err) => {
      if (err) {
        console.error("DB insert error:", err);
        return res.status(500).json({ error: "Database insert failed" });
      }
      res.json({
        message: "Video uploaded & compressed",
        filename: outputFilename,
      });
    });
  });
});

// Serve compressed videos
app.use("/videos", express.static(compressedDir));

// Get list of videos
app.get("/videos", (req, res) => {
  const sql = "SELECT id, filename FROM videos";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("DB query error:", err);
      return res.status(500).json({ error: "Failed to fetch videos" });
    }
    res.json(results);
  });
});

// server.js

// ... after your other routes

app.get("/stream/:filename", (req, res) => {
  const { filename } = req.params;
  const videoPath = path.join(compressedDir, filename);

  if (!fs.existsSync(videoPath)) {
    return res.status(404).send("Video not found");
  }

  const videoStat = fs.statSync(videoPath);
  const fileSize = videoStat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunksize = end - start + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": "video/mp4",
    };

    res.writeHead(206, head); // 206 Partial Content
    file.pipe(res);
  } else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    };
    res.writeHead(200, head); // 200 OK
    fs.createReadStream(videoPath).pipe(res);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
