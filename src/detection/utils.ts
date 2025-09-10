import { ReferenceAsset } from '../models/ReferenceAsset';

/**
 * Calculate Hamming distance between two hex strings.
 * Lower distance = more similar.
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (!hash1 || !hash2) return Number.MAX_SAFE_INTEGER;
  if (hash1.length !== hash2.length) return Number.MAX_SAFE_INTEGER;

  let dist = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) dist++;
  }
  return dist;
}

/**
 * Get candidate reference assets for given pHashes.
 * Used by imageScanner to limit DB search space.
 */
export async function getCandidateRefsByPHash(phashes: string[]) {
  if (!phashes || phashes.length === 0) return [];

  return ReferenceAsset.find({
    mediaType: 'image',
    'hashes.phash': { $in: phashes }
  }).lean();
}

/**
 * Get candidate reference assets for given simHash.
 * Used by textScanner to limit DB search space.
 */
export async function getCandidateRefsBySimHash(simhash: string) {
  if (!simhash) return [];

  return ReferenceAsset.find({
    mediaType: 'text',
    'hashes.simhash': simhash
  }).lean();
}
