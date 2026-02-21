import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis({ maxRetriesPerRequest: null });

export const videoQueue = new Queue("video-compression", { connection });

// NEW: This allows us to listen to worker events globally
export const queueEvents = new QueueEvents("video-compression", { connection });

export { connection };
