/**
 * Policy decision object
 */
export interface PolicyDecision {
  decision: "allow" | "violation" | "review";
  reason: string;
}

/**
 * Thresholds for different media types
 * score = similarity (0 to 1)
 */
const THRESHOLDS = {
  image: {
    violation: 0.9, // >= 90% match → violation
    review: 0.75    // 75%–90% match → review
  },
  text: {
    violation: 1.0, // exact simhash match → violation
    review: 0.85
  },
  video: {
    violation: 0.9,
    review: 0.75
  },
  audio: {
    violation: 0.9,
    review: 0.75
  }
};

/**
 * Decide final action based on media type, match score, and reference asset policy
 */
export function decide(
  mediaType: "image" | "video" | "audio" | "text",
  score: number,
  policy: "block" | "track" | "allow"
): PolicyDecision {
  const thresholds = THRESHOLDS[mediaType];

  // If asset owner allows it, always allow
  if (policy === "allow") {
    return { decision: "allow", reason: "Reference asset policy allows usage" };
  }

  // If asset owner wants to block
  if (policy === "block") {
    if (score >= thresholds.violation) {
      return { decision: "violation", reason: `Match score ${score} exceeds violation threshold` };
    }
    if (score >= thresholds.review) {
      return { decision: "review", reason: `Match score ${score} exceeds review threshold` };
    }
    return { decision: "allow", reason: "Match score below review threshold" };
  }

  // If asset owner wants to track
  if (policy === "track") {
    if (score >= thresholds.violation) {
      return { decision: "review", reason: "Track policy: high match score, needs review" };
    }
    return { decision: "allow", reason: "Track policy: match score below violation threshold" };
  }

  // Default fallback
  return { decision: "allow", reason: "No matching policy rule" };
}
