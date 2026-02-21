import express from "express";
import multer from "multer";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import mysql from "mysql2";
import { Server } from "socket.io";
import cors from "cors";
import { videoQueue, queueEvents } from "./queueSetup.js";
import http from "http";

const app = express();
const server = http.createServer(app);
const PORT = 5000;

// Enable CORS
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Your React app's URL
    methods: ["GET", "POST"],
  },
});

// Listen for connection
io.on("connection", (socket) => {
  console.log(`User connected to dashboard: ${socket.id}`);
});

// NEW: Listen to BullMQ and broadcast to React
queueEvents.on("completed", ({ jobId, returnvalue }) => {
  console.log(`Job ${jobId} completed! Notifying frontend...`);

  // Broadcast a message to all connected React clients
  io.emit("video-completed", {
    message: "A new video has finished processing!",
    jobId: jobId,
  });
});

// Multer for uploads
const upload = multer({ dest: "uploads/" });

// Ensure compressed directory exists
const compressedDir = path.join(process.cwd(), "compressed");
if (!fs.existsSync(compressedDir)) fs.mkdirSync(compressedDir);

// MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "dashuser",
  password: "mypassword",
  database: "vid",
});

db.connect((err) => {
  if (err) console.error("MySQL connection failed:", err);
  else console.log("Connected to MySQL");
});

// Resolutions & CRF values for VP9
const resolutions = [720, 480, 360];
const crfs = { 720: 32, 480: 34, 360: 36 }; // higher CRF → smaller file

// Upload route
app.post("/upload", upload.single("video"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    // 1. Insert original video metadata IMMEDIATELY to get the DB ID
    db.query(
      "INSERT INTO videos (original_filename) VALUES (?)",
      [req.file.originalname],
      async (err, result) => {
        if (err) return res.status(500).json({ error: "DB insert failed" });

        const videoId = result.insertId;

        // 2. Add the heavy lifting to the background queue
        const job = await videoQueue.add("compress-vp9", {
          videoId: videoId,
          inputPath: req.file.path,
        });

        // 3. Respond to the user right away! No waiting for FFmpeg.
        res.status(202).json({
          message:
            "Video uploaded successfully. Compression started in the background.",
          jobId: job.id,
          videoId: videoId,
        });
      },
    );
  } catch (err) {
    console.error("Queue error:", err);
    res.status(500).json({ error: "Failed to queue video" });
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

// const PORT = 5000;
server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);
