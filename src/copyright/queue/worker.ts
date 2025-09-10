import { Worker } from 'bullmq';
import { handleScan } from './workerHandle';

const connection = { url: process.env.REDIS_URL! };

// Worker to process copyright scan jobs
export const scanWorker = new Worker(
  'copyright-scan',
  async (job) => {
    if (job.name === 'scan') {
      await handleScan(job.data);
    }
  },
  { connection }
);

scanWorker.on('completed', (job) => {
  console.log(`✅ Scan job ${job.id} completed`);
});

scanWorker.on('failed', (job, err) => {
  console.error(`❌ Scan job ${job?.id} failed:`, err);
});
