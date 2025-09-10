import { Queue } from 'bullmq';

const connection = { url: process.env.REDIS_URL! };

export const scanQueue = new Queue('copyright-scan', { connection });

export async function enqueueScan(job: {
  postId: string;
  mediaType: 'image' | 'text';
  urls?: string[];
  text?: string;
}) {
  await scanQueue.add('scan', job, {
    attempts: 3,
    removeOnComplete: true,
    backoff: { type: 'exponential', delay: 5000 }
  });
}
