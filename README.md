📹 Video Compression & Adaptive Streaming Platform

A full-stack platform for uploading, compressing, storing, and streaming VP9/Opus videos with adaptive multi-resolution support.
Built with Node.js, Express, FFmpeg, MySQL, React, Multer, and Docker-ready architecture.

🚀 Features
🔧 Backend (Node.js + FFmpeg)

Compresses videos using VP9 (libvpx-vp9) with Opus audio

Reduces file size by ~65% using CRF-based encoding

Generates multiple resolutions automatically:

720p, 480p, 360p

Adaptive CRF values:

720p → CRF 32

480p → CRF 34

360p → CRF 36

Stores video metadata and versions in MySQL

Upload handling using Multer

Streaming with HTTP Range headers (required for seeking & smooth playback)

Real-time FFmpeg progress logs

Static file serving for compressed output

🎨 Frontend (React)

Upload videos

List all videos with available resolutions

Play videos by selecting a desired version

Adaptive playback with <video> element

🏗️ Tech Stack
Layer	Technologies
Backend	Node.js, Express, FFmpeg, Multer, MySQL2
Frontend	React
Database	MySQL
Video Codec	VP9 (libvpx-vp9), Opus
Containerization	Docker-Ready
📁 Project Structure (Backend)
/uploads             → Temporary uploaded files
/compressed          → FFmpeg output videos (multi-resolution)
/src or root         → Express server (index.js/server.js)
/frontend            → React app (optional)

⚙️ Requirements
Install FFmpeg (Windows 11)

Download FFmpeg from: https://www.gyan.dev/ffmpeg/builds/

Add it to PATH:

Control Panel → System → Advanced System Settings → PATH → Add FFmpeg bin folder

Install MySQL

Create database:

CREATE DATABASE newVid;

CREATE TABLE videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  original_filename VARCHAR(255),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE video_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  video_id INT,
  filename VARCHAR(255),
  path VARCHAR(255),
  resolution INT,
  FOREIGN KEY (video_id) REFERENCES videos(id)
);

🔌 Environment Setup (Backend)
1. Install dependencies
npm install

2. Update MySQL credentials

In the server file:

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "your_password",
  database: "newVid",
});

3. Run server
node server.js


Server starts on:

http://localhost:5000

🧪 API Endpoints
📤 1. Upload Video

POST /upload
Form-Data:

video: <file>


Response:

{
  "message": "Video uploaded & compressed",
  "versions": [
    { "resolution": 720, "filename": "...720p.webm" },
    { "resolution": 480, "filename": "...480p.webm" },
    { "resolution": 360, "filename": "...360p.webm" }
  ]
}

📄 2. Get All Videos

GET /videos

Response:

[
  {
    "id": 1,
    "original_filename": "example.mp4",
    "versions": [
      { "id": 10, "filename": "...720p.webm", "resolution": 720 },
      { "id": 11, "filename": "...480p.webm", "resolution": 480 }
    ]
  }
]

▶️ 3. Stream Video

GET /stream/:filename

Supports:

Range requests

Seeking

Browser video playback

Example:

http://localhost:5000/stream/17000000123-720p.webm

🎮 Frontend Usage (React)

Your React app can:

Upload via /upload

Fetch list via /videos

Play videos using:

<video controls src={`http://localhost:5000/stream/${filename}`} />

🛠️ How the Compression Pipeline Works

User uploads a source video → stored in /uploads

FFmpeg runs 3 sequential encodes:

Scale to 720p, 480p, 360p

Encode using libvpx-vp9

Apply CRF (quality) and bitrate settings

Compressed files stored in /compressed

MySQL saves metadata for:

Original file

All versions with resolution and path

React frontend lists videos + resolutions

When streamed:

Server handles Range requests

Sends partial chunks for smooth playback and seeking

📦 Output Example
compressed/
  1700000000-720p.webm
  1700000000-480p.webm
  1700000000-360p.webm

🧩 Future Enhancements

Adaptive streaming via DASH or HLS

JWT-based authentication

Automatic cleanup for old original files

Progress bar using WebSockets

❤️ Credits

Built using Node.js, FFmpeg, React, and MySQL.
Optimized for VP9 + Opus compression workflows.