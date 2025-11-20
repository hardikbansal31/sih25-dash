# Video Compression & Adaptive Streaming Platform

A complete video compression and adaptive streaming service built using **Node.js, Express, FFmpeg (VP9 + Opus), React, MySQL, Multer, and Docker**. This platform compresses uploaded videos into multiple resolutions and streams them efficiently using HTTP Range requests.

---

## 🚀 Features

* **Multi-resolution video compression** (720p, 480p, 360p)
* **VP9 + Opus codec** for high-quality compression
* **Adaptive CRF values** for optimal file size reduction
* **Secure upload API** using Multer
* **Real-time FFmpeg logs** while compressing
* **REST API for listing videos and versions**
* **HTTP Range-based streaming API**
* **MySQL database integration** for storing metadata
* **Docker-ready structure**

---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express.js
* **Video Compression:** FFmpeg (libvpx-vp9, libopus)
* **Database:** MySQL
* **Storage:** Local filesystem (`uploads/`, `compressed/`)
* **File Upload:** Multer
* **Frontend (Optional):** React
* **Containerization:** Docker

---

## 📁 Project Structure

```bash
project/
├── uploads/              # Raw uploaded videos
├── compressed/           # Compressed video outputs
├── server.js             # Main server file
├── package.json
└── README.md
```

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone <repo-url>
cd project
```

### 2. Install dependencies

```bash
npm install
```

### 3. Install FFmpeg

Windows 11 users can install FFmpeg via:

```bash
choco install ffmpeg
```

or manually from ffmpeg.org.

### 4. Set up MySQL database

Create a database:

```sql
CREATE DATABASE newVid;
```

Create required tables:

```sql
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
```

Update credentials in `server.js`:

```js
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "yourpassword",
  database: "newVid",
});
```

---

## ▶️ Running the Server

Start the backend:

```bash
node server.js
```

Server runs at:

```
http://localhost:5000
```

---

## 📤 API Endpoints

### **1. Upload a video**

**POST** `/upload`

* Accepts: `form-data` → `video: <file>`
* Compresses the video to 720p, 480p, 360p
* Stores metadata in MySQL

**Response:**

```json
{
  "message": "Video uploaded & compressed",
  "versions": [
    { "resolution": 720, "filename": "...", "path": "..." }
  ]
}
```

---

### **2. Get all videos**

**GET** `/videos`

Returns grouped video metadata and all available compressed versions.

---

### **3. Stream a compressed video**

**GET** `/stream/:filename`

Supports HTTP Range headers for smooth streaming on video players.

Example:

```
http://localhost:5000/stream/1731859959-720p.webm
```

---

Build and run:

```bash
docker build -t video-compressor .
docker run -p 5000:5000 video-compressor
```

---

## 📌 Notes

* Uses CRF mode to maintain quality instead of fixed bitrate.
* Deletes the original uploaded video after compression to save space.
* Uses `libvpx-vp9` for efficient WebM compression.

---

## 📄 License

MIT

---

