# ClassStream

A full-stack video platform for teachers and students. Teachers upload raw videos; the platform automatically encodes them to HLS and streams them adaptively based on the viewer's bandwidth — the same way YouTube and Netflix work.

Built as a portfolio project to demonstrate production-grade Node.js architecture.

---

## Architecture

```
┌─────────────┐     HTTP/WS      ┌──────────────┐     BullMQ      ┌──────────────┐
│   React     │ ◄──────────────► │   Express    │ ──────────────► │    Worker    │
│  Frontend   │                  │   Server     │                  │  (FFmpeg)    │
└─────────────┘                  └──────┬───────┘                  └──────┬───────┘
                                        │                                  │
                                   ┌────┴────┐                       ┌────┴────┐
                                   │  MySQL  │                       │  Redis  │
                                   └─────────┘                       └─────────┘
```

The server and worker are decoupled — the HTTP request returns immediately after queueing, and FFmpeg runs in a completely separate process. This means the server never blocks on encoding.

---

## Features

### Adaptive HLS Streaming
Videos are encoded to three renditions (720p, 480p, 360p) using FFmpeg and served as HLS (HTTP Live Streaming). The player uses [hls.js](https://github.com/video-dev/hls.js/) to automatically switch quality based on available bandwidth. Manual override is also available. This is the same protocol used by YouTube, Netflix, and Twitch.

### Real-time Progress
Upload progress and compression progress are both tracked and shown live:
- **Upload phase** — browser reports byte-level progress via `XMLHttpRequest` (not `fetch`, which doesn't expose this)
- **Compression phase** — the FFmpeg worker parses `stderr` in real time, extracts the current encode timestamp, and maps it to an overall percentage via `job.updateProgress()`. This propagates through Redis → BullMQ queue events → Socket.IO → React with no polling

### Background Job Queue
Video compression is handled by BullMQ backed by Redis. Jobs survive server restarts, support automatic retries with exponential backoff (1s → 2s → 4s), and failed jobs are preserved for inspection. The worker runs as a completely separate process with `concurrency: 1` since FFmpeg already saturates a single CPU core.

### JWT Authentication with Role-based Access
- Two roles: `teacher` (upload + view) and `student` (view only)
- Passwords are hashed with bcrypt (12 salt rounds) with constant-time comparison to prevent timing attacks
- JWTs are verified on every protected route via middleware
- Token validation on page load via `/auth/me` keeps users logged in across refreshes

### Graceful Worker Shutdown
`SIGTERM` and `SIGINT` are handled — the worker finishes its current FFmpeg encode before exiting rather than killing the process mid-stream, which would leave orphaned jobs permanently stuck in "active" state in Redis.

### Upload Validation
- MIME type allowlist (mp4, webm, mov, avi, mkv, mpeg)
- 500 MB file size limit enforced at the multer layer before the file is fully read
- Multer errors (oversized files) are caught and returned as clean JSON rather than crashing the server

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, hls.js |
| Server | Node.js, Express 5, Socket.IO |
| Worker | BullMQ, FFmpeg (H.264 + AAC → HLS) |
| Queue | Redis via IORedis |
| Database | MySQL 8 |
| Auth | JWT (jsonwebtoken), bcrypt |
| Container | Docker, Docker Compose, Nginx |

---

## Project Structure

```
src/
├── server.js           Express server, Socket.IO, queue event forwarding
├── worker.js           BullMQ worker, FFmpeg HLS encoding, progress reporting
├── queueSetup.js       Shared Redis connection, queue and event instances
├── authMiddleware.js   verifyToken and requireRole middleware
├── authRoutes.js       POST /auth/login, GET /auth/me
├── seed.js             Creates initial teacher/student users
└── components/
    ├── Icons.jsx        SVG icon set (no emoji, no external library)
    ├── LoginPage.jsx
    ├── UploadCard.jsx   Drag-and-drop upload with thumbnail preview
    ├── VideoList.jsx
    ├── HlsPlayer.jsx    hls.js player with ABR + manual quality selector
    ├── ActiveJobsPanel.jsx  Live compression progress cards
    ├── FileThumbnail.jsx    Canvas-based video frame extraction
    ├── ProgressBar.jsx
    └── ToastContainer.jsx

docker/
├── frontend/
│   ├── Dockerfile      Multi-stage: Vite build → Nginx serve
│   └── nginx.conf      SPA routing + reverse proxy for /api, /hls, /socket.io
├── server/Dockerfile
├── worker/Dockerfile   Includes FFmpeg
└── mysql/init.sql      Schema, runs automatically on first boot
```

---

## Getting Started

### Prerequisites
- Node.js 22+
- Redis
- MySQL 8
- FFmpeg (`brew install ffmpeg` / `apt install ffmpeg`)

### Local development

```bash
# Install dependencies
npm install

# Start MySQL and Redis (or use Docker just for these)
docker compose up mysql redis -d

# Seed initial users
node src/seed.js

# Start the server (terminal 1)
node src/server.js

# Start the worker (terminal 2)
node src/worker.js

# Start the frontend (terminal 3)
npm run dev
```

Open `http://localhost:8080`. Default credentials after seeding:

| Username | Password | Role |
|---|---|---|
| `teacher1` | `changeme123` | Teacher |
| `student1` | `changeme123` | Student |

### Docker (full stack)

```bash
cp .env.example .env
# Set JWT_SECRET in .env

docker compose up --build
```

Open `http://localhost:8080`. Everything — MySQL, Redis, server, worker, and frontend — starts with that single command.

---

## API Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/login` | — | Returns JWT token |
| `GET` | `/auth/me` | Any | Validates stored token |
| `POST` | `/upload` | Teacher | Queues video for HLS encoding |
| `GET` | `/videos` | Any | Lists videos with HLS URLs |
| `GET` | `/hls/:videoId/master.m3u8` | — | HLS master playlist |

---

## How the HLS Pipeline Works

1. Teacher uploads a video → server saves metadata to MySQL and adds a job to Redis via BullMQ → responds `202` immediately
2. Worker picks up the job → runs FFmpeg three times (720p, 480p, 360p), each producing a `.m3u8` playlist and numbered `.ts` segment files
3. Worker writes a `master.m3u8` that lists all three renditions with bandwidth hints → saves path to MySQL → marks job complete
4. Server receives the `completed` event from BullMQ → emits `video-completed` via Socket.IO → React refreshes the video list
5. Student clicks play → hls.js fetches `master.m3u8` → selects the best rendition for current bandwidth → fetches segments on demand → switches quality automatically as conditions change

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | *(must set)* | Signs auth tokens |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_USER` | `dashuser` | MySQL user |
| `DB_PASSWORD` | `mypassword` | MySQL password |
| `DB_NAME` | `vid` | Database name |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `PORT` | `5000` | Express server port |
| `FRONTEND_URL` | `http://localhost:5173` | CORS allowed origin |
