/**
 * audioProcessor.js
 * Foundational BullMQ worker for the Automated Audio Fingerprinting & Speaker Diarization Pipeline.
 * Simulates handing off an audio file to a Python microservice for processing.
 */

const { Worker } = require("bullmq");
const IORedis = require("ioredis");

// Initialize Redis connection for the queue
const connection = new IORedis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379",
  {
    maxRetriesPerRequest: null,
  },
);

/**
 * Simulates calling out to a Python microservice (WhisperX / pyannote.audio)
 * to perform speaker diarization on a raw audio file.
 */
async function simulatePythonDiarizationMicroservice(audioFileUrl) {
  return new Promise((resolve) => {
    console.log(
      `[AudioProcessor] Sending ${audioFileUrl} to Python Diarization Service...`,
    );
    setTimeout(() => {
      resolve({
        status: "success",
        transcript: [
          {
            speaker: "SPEAKER_00",
            text: "Welcome to the meeting.",
            start: 0.0,
            end: 2.5,
          },
          {
            speaker: "SPEAKER_01",
            text: "Thanks for having me.",
            start: 3.0,
            end: 4.5,
          },
        ],
        confidenceScore: 0.94,
      });
    }, 5000); // Simulate 5 second processing time
  });
}

// Initialize the worker to consume jobs from the 'audio-processing' queue
const audioWorker = new Worker(
  "audio-processing",
  async (job) => {
    const { meetingId, audioFileUrl } = job.data;

    console.log(
      `[AudioWorker] Starting job ${job.id} for meeting ${meetingId}`,
    );

    try {
      // Call the diarization service
      const result = await simulatePythonDiarizationMicroservice(audioFileUrl);

      console.log(`[AudioWorker] Job ${job.id} completed successfully.`);
      return result;
    } catch (error) {
      console.error(`[AudioWorker] Job ${job.id} failed:`, error);
      throw error; // Let BullMQ handle retries
    }
  },
  { connection },
);

audioWorker.on("completed", (job, returnvalue) => {
  console.log(`[AudioWorker] Job ${job.id} has completed!`);
});

audioWorker.on("failed", (job, err) => {
  console.log(`[AudioWorker] Job ${job.id} has failed with ${err.message}`);
});

module.exports = audioWorker;
