/**
 * ScoreConfig — End-of-session score display tuning and helpers.
 *
 * Config-driven. Score grades, sign rating labels, and formatting.
 */

export interface ScoreGrade {
  label: string;
  minScore: number;
  color: string;
}

export const SCORE_GRADES: ScoreGrade[] = [
  { label: 'S', minScore: 2000, color: '#fbbf24' },
  { label: 'A', minScore: 1200, color: '#22c55e' },
  { label: 'B', minScore: 700, color: '#3b82f6' },
  { label: 'C', minScore: 400, color: '#8b5cf6' },
  { label: 'D', minScore: 200, color: '#f97316' },
  { label: 'F', minScore: 0, color: '#ef4444' },
];

export function getScoreGrade(score: number): ScoreGrade {
  for (const grade of SCORE_GRADES) {
    if (score >= grade.minScore) return grade;
  }
  return SCORE_GRADES[SCORE_GRADES.length - 1];
}

export function getSignRatingLabel(qualityScore: number): string {
  if (qualityScore >= 0.8) return 'POWERFUL';
  if (qualityScore >= 0.6) return 'STRONG';
  if (qualityScore >= 0.4) return 'DECENT';
  return 'BASIC';
}

export function getSignRatingStars(qualityScore: number): string {
  if (qualityScore >= 0.8) return '\u2605\u2605\u2605';
  if (qualityScore >= 0.6) return '\u2605\u2605\u2606';
  if (qualityScore >= 0.4) return '\u2605\u2606\u2606';
  return '\u2606\u2606\u2606';
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
