import { collectHealth } from "../config/health.js";
import {
  getQueueStatus,
  getQueueInstance,
  KNOWN_QUEUE_NAMES,
} from "./queueService.js";
import mongoose from "mongoose";
import { getRedisClient } from "./redisService.js";

/**
 * Compiles a detailed diagnostic health report of critical backend systems.
 * Includes MongoDB, Redis, and background worker queues.
 * Restricts sensitive info to authenticated admin access only (Issue #2082).
 */
export const getAdminHealthReport = async () => {
  // Collect general health status
  const health = await collectHealth();

  // MongoDB details
  let mongoDetails = {
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host || "unknown",
    port: mongoose.connection.port || "unknown",
    name: mongoose.connection.name || "unknown",
  };
  try {
    if (mongoose.connection.readyState === 1) {
      const stats = await mongoose.connection.db.stats();
      mongoDetails = {
        ...mongoDetails,
        collections: stats.collections,
        objects: stats.objects,
        avgObjSize: stats.avgObjSize,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
      };
    }
  } catch (err) {
    mongoDetails.error = err.message;
  }

  // Redis details
  let redisDetails = {
    configured: Boolean(process.env.REDIS_URI || process.env.REDIS_URL),
  };
  try {
    const client = getRedisClient();
    if (client) {
      redisDetails.status = client.status || "unknown";
      if (typeof client.info === "function" && client.status === "ready") {
        const infoRaw = await client.info();
        const memoryMatch = infoRaw.match(/used_memory_human:([^\r\n]+)/);
        const uptimeMatch = infoRaw.match(/uptime_in_seconds:([^\r\n]+)/);
        const connectedClients = infoRaw.match(/connected_clients:([^\r\n]+)/);

        redisDetails.usedMemory = memoryMatch ? memoryMatch[1] : "unknown";
        redisDetails.uptimeSeconds = uptimeMatch
          ? parseInt(uptimeMatch[1], 10)
          : "unknown";
        redisDetails.connectedClients = connectedClients
          ? parseInt(connectedClients[1], 10)
          : "unknown";
      }
    }
  } catch (err) {
    redisDetails.error = err.message;
  }

  // Queue details
  const queueStatus = getQueueStatus();
  const queues = [];
  let queuesUp = 0;
  let queuesDown = 0;

  for (const name of KNOWN_QUEUE_NAMES) {
    const queue = getQueueInstance(name);
    if (!queue) {
      queuesDown++;
      queues.push({
        name,
        available: false,
        status: "disabled",
        counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      });
      continue;
    }

    try {
      const counts = await queue.getJobCounts(
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
      );
      queuesUp++;
      queues.push({
        name,
        available: true,
        status: "operational",
        counts: {
          waiting: counts.waiting || 0,
          active: counts.active || 0,
          completed: counts.completed || 0,
          failed: counts.failed || 0,
          delayed: counts.delayed || 0,
        },
      });
    } catch (error) {
      queuesDown++;
      queues.push({
        name,
        available: false,
        status: "error",
        error: error.message,
        counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      });
    }
  }

  const queueReport = {
    status: queueStatus.redisConfigured
      ? queuesDown > 0
        ? "degraded"
        : "operational"
      : "disabled",
    redisConfigured: queueStatus.redisConfigured,
    shuttingDown: queueStatus.shuttingDown,
    queuesCount: KNOWN_QUEUE_NAMES.length,
    activeWorkersCount: queueStatus.workers.length,
    queuesUp,
    queuesDown,
    queues,
  };

  return {
    success: true,
    overallStatus: health.status,
    timestamp: new Date().toISOString(),
    dependencies: {
      mongodb: {
        ...health.dependencies.mongodb,
        details: mongoDetails,
      },
      redis: {
        ...health.dependencies.redis,
        details: redisDetails,
      },
      queues: queueReport,
    },
  };
};
