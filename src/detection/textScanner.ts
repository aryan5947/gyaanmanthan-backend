// src/detection/textScanner.ts
import { SimHash } from 'simhash';
import natural from 'natural';
import { getCandidateRefsBySimHash, hammingDistance } from './utils';

export async function scanText(text: string) {
  // Tokenize & normalize
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(text.toLowerCase());

  // Generate simhash
  const sh = new SimHash().hash(tokens.join(' '));

  // Fetch candidate reference assets
  const candidates = await getCandidateRefsBySimHash(sh);

  // Score matches
  const scored = candidates.map((ref: any) => {
    const dist = hammingDistance(sh, ref.hashes.simhash!);
    const score = 1 - dist / 64; // normalize to 0..1
    return { ref, score };
  });

  // Pick best match
  const best = scored.sort(
    (a: { score: number }, b: { score: number }) => b.score - a.score
  )[0];

  return { simhash: sh, best };
}
