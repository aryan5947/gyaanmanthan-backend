import { scanImage } from '../../detection/imageScanner';
import { scanText } from '../../detection/textScanner';
import { getCandidateRefsByPHash, getCandidateRefsBySimHash, hammingDistance } from '../../detection/utils';
import { decide } from '../policy/policyEngine';
import { saveFingerprint, findRefPolicy, saveMatch, updatePostStatus } from '../repo';

/**
 * Handles scanning job for Post or PostMeta
 */
export async function handleScan(job: {
  postId: string;
  mediaType: 'image' | 'text';
  urls?: string[];
  text?: string;
}) {
  if (job.mediaType === 'image' && job.urls?.length) {
    // 1. Scan image and get pHashes
    const { phashes } = await scanImage(job.urls);

    // 2. Save fingerprint
    await saveFingerprint(job.postId, { mediaType: 'image', hashes: { phash: phashes }, version: 1 });

    // 3. Get candidate reference assets
    const candidates = await getCandidateRefsByPHash(phashes);

    if (!candidates.length) {
      return await updatePostStatus(job.postId, 'active', undefined, 'passed');
    }

    // 4. Calculate best match
    const scores = candidates.map((ref: any) => {
      const distances: number[] = [];
      for (const h1 of phashes) {
        for (const h2 of (ref.hashes.phash || [])) {
          distances.push(hammingDistance(h1, h2));
        }
      }
      const bestDist = Math.min(...distances);
      const score = 1 - bestDist / (phashes[0]?.length || 64);
      return { ref, score };
    });

    const best = scores.sort((a, b) => b.score - a.score)[0];

    // 5. Decide policy
    const refPolicy = await findRefPolicy(best.ref._id);
    const decision = decide('image', best.score, refPolicy);

    // 6. Save match
    await saveMatch(job.postId, best.ref._id, 'image', best.score, decision.decision);

    // 7. Update status
    await updatePostStatus(job.postId, mapDecisionToStatus(decision.decision), getReason(decision.decision), mapDecisionToScanStatus(decision.decision));
  }

  if (job.mediaType === 'text' && job.text) {
    // 1. Scan text and get simHash
    const { simhash } = await scanText(job.text);

    // 2. Save fingerprint
    await saveFingerprint(job.postId, { mediaType: 'text', hashes: { simhash }, version: 1 });

    // 3. Get candidate reference assets
    const candidates = await getCandidateRefsBySimHash(simhash);

    if (!candidates.length) {
      return await updatePostStatus(job.postId, 'active', undefined, 'passed');
    }

    // 4. Calculate best match (for text, score = 1 if simhash matches exactly)
    const scores = candidates.map((ref: any) => ({
      ref,
      score: ref.hashes.simhash === simhash ? 1 : 0
    }));

    const best = scores.sort((a, b) => b.score - a.score)[0];

    // 5. Decide policy
    const refPolicy = await findRefPolicy(best.ref._id);
    const decision = decide('text', best.score, refPolicy);

    // 6. Save match
    await saveMatch(job.postId, best.ref._id, 'text', best.score, decision.decision);

    // 7. Update status
    await updatePostStatus(job.postId, mapDecisionToStatus(decision.decision), getReason(decision.decision), mapDecisionToScanStatus(decision.decision));
  }
}

/**
 * Maps decision to post status
 */
function mapDecisionToStatus(decision: 'allow' | 'violation' | 'review') {
  if (decision === 'violation') return 'restricted';
  return 'active';
}

/**
 * Maps decision to scan status
 */
function mapDecisionToScanStatus(decision: 'allow' | 'violation' | 'review') {
  if (decision === 'violation') return 'failed';
  if (decision === 'review') return 'pending';
  return 'passed';
}

/**
 * Returns reason string for restriction
 */
function getReason(decision: 'allow' | 'violation' | 'review') {
  if (decision === 'violation') return 'Copyright violation detected';
  if (decision === 'review') return 'Content flagged for manual review';
  return undefined;
}
