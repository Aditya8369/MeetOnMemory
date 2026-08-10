import { Worker, Queue } from "bullmq";
import Redis from "ioredis";
import dotenv from "dotenv";
import { generateMoMDetailed } from "./services/GenerativeAIService.js";

dotenv.config();

const REDIS_URI = process.env.REDIS_URI || "redis://localhost:6379";

const connection = new Redis(REDIS_URI, {
  maxRetriesPerRequest: null,
  family: 0,
});

const producerConnection = new Redis(REDIS_URI, {
  maxRetriesPerRequest: 3,
  family: 0,
});

const resultsQueue = new Queue("ai-mom-results", {
  connection: producerConnection,
});

const worker = new Worker("ai-mom-generation", async (job) => {
  const { meetingId, transcript, date, title, customInstructions, userId } = job.data;
  
  console.log(`[Worker] Generating MoM for ${meetingId || "transcript-only"}...`);
  
  let textToSummarize = (transcript || "").trim();
  if (!textToSummarize) {
    throw new Error("No transcript provided.");
  }

  // Generate MoM
  const { mom: generated, generation } = await generateMoMDetailed(
    textToSummarize,
    date,
    title,
    customInstructions,
  );
  
  // Publish result back to the main server
  await resultsQueue.add("ai-mom-result-job", {
    meetingId,
    userId,
    transcript: textToSummarize,
    date,
    title,
    structuredMoM: generated,
    generation
  });
  
  return { success: true, meetingId };
}, {
  connection,
  concurrency: 1 // To prevent event loop blocking, process one by one
});

worker.on("completed", (job) => {
  console.log(`✅ [Worker] Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ [Worker] Job ${job?.id} failed: ${err.message}`);
});

console.log("🚀 AI Worker is running and listening to 'ai-mom-generation' queue.");
