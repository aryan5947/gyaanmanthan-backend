import imghash from 'imghash';
import sharp from 'sharp';
import { getCandidateRefsByPHash, hammingDistance } from './utils';

export async function scanImage(urls: string[]) {
  const phashes: string[] = [];

  for (const url of urls) {
    const buf = await fetch(url)
      .then(r => r.arrayBuffer())
      .then(b => Buffer.from(b));

    const normalized = await sharp(buf)
      .resize(512, 512, { fit: 'inside' })
      .toFormat('jpeg')
      .toBuffer();

    // @ts-ignore — imghash can handle Buffer at runtime
    const hash = await imghash.hash(normalized, 16, 'hex');
    phashes.push(hash);
  }

  const candidates = await getCandidateRefsByPHash(phashes);

  const scores = candidates.map((ref: any) => {
    const distances: number[] = [];
    for (const h1 of phashes) {
      for (const h2 of (ref.hashes.phash || [])) {
        distances.push(hammingDistance(h1, h2));
      }
    }
    const bestDist = Math.min(...distances);
    const score = 1 - bestDist / 256;
    return { ref, score };
  });

  const best = scores.sort(
    (a: { score: number }, b: { score: number }) => b.score - a.score
  )[0];

  return { phashes, best };
}
