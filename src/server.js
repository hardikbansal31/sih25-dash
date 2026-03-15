import express from "express";
import multer from "multer";
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

app.use(cors({ origin: "http://localhost:5173", methods: ["GET", "POST"] }));

const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
});

// ── Queue event forwarding ────────────────────────────────────────────────────

queueEvents.on("progress", ({ jobId, data: progress }) => {
  // progress is whatever value was passed to job.updateProgress()
  // We forward it straight to all connected clients
  io.emit("video-progress", { jobId, progress });
});

queueEvents.on("completed", ({ jobId }) => {
  console.log(`Job ${jobId} completed.`);
  io.emit("video-completed", { jobId });
});

queueEvents.on("failed", ({ jobId, failedReason }) => {
  console.log(`Job ${jobId} failed: ${failedReason}`);
  io.emit("video-failed", { jobId, message: failedReason });
});

// ── Multer ────────────────────────────────────────────────────────────────────

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 500 * 1024 * 1024 },
});

const ALLOWED_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/mpeg",
];

function validateVideoMime(req, res, next) {
  const mime = req.file?.mimetype;
  if (!mime || !ALLOWED_MIME_TYPES.includes(mime)) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    return res.status(415).json({
      error: `Unsupported file type: ${mime ?? "unknown"}.`,
    });
  }
  next();
}

function handleUploadErrors(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE")
      return res
        .status(413)
        .json({ error: "File too large. Maximum size is 500 MB." });
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  next(err);
}

// ── Setup ─────────────────────────────────────────────────────────────────────

const compressedDir = path.join(process.cwd(), "compressed");
if (!fs.existsSync(compressedDir)) fs.mkdirSync(compressedDir);

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

// ── Routes ────────────────────────────────────────────────────────────────────

app.post(
  "/upload",
  (req, res, next) =>
    upload.single("video")(req, res, (err) => {
      if (err) return handleUploadErrors(err, req, res, next);
      next();
    }),
  validateVideoMime,
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    db.query(
      "INSERT INTO videos (original_filename) VALUES (?)",
      [req.file.originalname],
      async (err, result) => {
        if (err) return res.status(500).json({ error: "DB insert failed" });

        const videoId = result.insertId;

        try {
          const job = await videoQueue.add(
            "compress-video",
            { videoId, inputPath: req.file.path },
            {
              attempts: 3,
              backoff: { type: "exponential", delay: 1000 },
              removeOnComplete: { age: 7 * 24 * 3600 },
              removeOnFail: false,
            },
          );

          res.status(202).json({
            message: "Video uploaded. Compression queued.",
            jobId: job.id,
            videoId,
          });
        } catch (err) {
          console.error("Queue error:", err);
          res.status(500).json({ error: "Failed to queue video" });
        }
      },
    );
  },
);

app.get("/videos", (req, res) => {
  const sql = `
    SELECT v.id as video_id, v.original_filename,
           vv.id as version_id, vv.filename, vv.resolution
    FROM videos v
    JOIN video_versions vv ON v.id = vv.video_id
    ORDER BY v.uploaded_at DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      if (err.code === "ER_NO_SUCH_TABLE") return res.json([]);
      return res
        .status(500)
        .json({ error: "Database error", details: err.message });
    }
    const grouped = results.reduce((acc, v) => {
      if (!acc[v.video_id]) {
        acc[v.video_id] = {
          id: v.video_id,
          original_filename: v.original_filename,
          versions: [],
        };
      }
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

app.get("/stream/:filename", (req, res) => {
  const videoPath = path.join(compressedDir, req.params.filename);
  if (!fs.existsSync(videoPath)) return res.status(404).send("Video not found");

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": "video/webm",
    });
    fs.createReadStream(videoPath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/webm",
    });
    fs.createReadStream(videoPath).pipe(res);
  }
});

app.use("/videos/static", express.static(compressedDir));

server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);
