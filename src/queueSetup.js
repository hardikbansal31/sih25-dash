import "dotenv/config";
import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
});

export const videoQueue = new Queue("video-compression", { connection });

// NEW: This allows us to listen to worker events globally
export const queueEvents = new QueueEvents("video-compression", { connection });

export { connection };
