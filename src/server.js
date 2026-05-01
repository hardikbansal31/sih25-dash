import "dotenv/config";
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import mysql from "mysql2";
import { Server } from "socket.io";
import cors from "cors";
import { videoQueue, queueEvents } from "./queueSetup.js";
import http from "http";
import { authRouter } from "./authRoutes.js";
import { verifyToken, requireRole } from "./authMiddleware.js";

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", methods: ["GET", "POST"] }));
app.use(express.json());
app.use("/auth", authRouter);

const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || "http://localhost:5173", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
});

// ── Queue event forwarding ────────────────────────────────────────────────────

queueEvents.on("progress", ({ jobId, data: progress }) => {
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
  "video/mkv",
  "application/x-matroska",
  "application/octet-stream"
];

function validateVideoMime(req, res, next) {
  const mime = req.file?.mimetype;
  const originalName = req.file?.originalname || "";
  const ext = path.extname(originalName).toLowerCase();

  const isValidMime = mime && ALLOWED_MIME_TYPES.includes(mime);
  const isValidExt = [".mp4", ".webm", ".mov", ".avi", ".mkv", ".mpeg", ".mpg"].includes(ext);

  if (!isValidMime && !isValidExt) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    return res
      .status(415)
      .json({ error: `Unsupported file type: ${mime ?? "unknown"} (ext: ${ext}).` });
  }
  next();
}

function handleUploadErrors(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE")
      return res
        .status(413)
        .json({ error: "File too large. Maximum is 500 MB." });
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  next(err);
}

// ── Compressed dir + static serving ──────────────────────────────────────────
//
// HLS needs three things served as static files:
//   1. master.m3u8      — top-level playlist hls.js fetches first
//   2. <rendition>.m3u8 — per-quality playlist listing segment URLs
//   3. <rendition>_seg*.ts — the actual video chunks
//
// express.static handles all three with correct Content-Type headers.
// The URL structure is:  /hls/<videoId>/master.m3u8
//                        /hls/<videoId>/720p.m3u8
//                        /hls/<videoId>/720p_seg000.ts  etc.
//
// We also set the correct MIME types so hls.js doesn't reject the responses.

const compressedDir = path.join(process.cwd(), "compressed");
if (!fs.existsSync(compressedDir)) fs.mkdirSync(compressedDir);

app.use(
  "/hls",
  (req, res, next) => {
    // Set MIME types that hls.js requires
    if (req.path.endsWith(".m3u8")) {
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    } else if (req.path.endsWith(".ts")) {
      res.setHeader("Content-Type", "video/mp2t");
    }
    // Allow the React dev server to load HLS resources cross-origin
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  },
  express.static(compressedDir),
);

// ── MySQL ─────────────────────────────────────────────────────────────────────

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "dashuser",
  password: process.env.DB_PASSWORD || "mypassword",
  database: process.env.DB_NAME || "vid",
});

db.connect((err) => {
  if (err) console.error("MySQL connection failed:", err);
  else console.log("Connected to MySQL");
});

// ── Routes ────────────────────────────────────────────────────────────────────

app.post(
  "/upload",
  verifyToken, // 401 if no/invalid token
  requireRole("teacher"), // 403 if role !== "teacher"
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
            message: "Video uploaded. HLS compression queued.",
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

// Returns videos with their HLS master playlist URL ready for hls.js
app.get("/videos", verifyToken, (req, res) => {
  const sql = `
    SELECT
      v.id           AS video_id,
      v.original_filename,
      vv.master_path
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

    // master_path is stored as e.g. "1/master.m3u8"
    // We expose a full URL the frontend can pass directly to hls.js
    const videos = results.map((row) => ({
      id: row.video_id,
      original_filename: row.original_filename,
      // hls.js will fetch: GET /hls/1/master.m3u8
      hlsUrl: `${process.env.BACKEND_URL || `http://localhost:${PORT}`}/hls/${row.master_path}`,
    }));

    res.json(videos);
  });
});

server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);
