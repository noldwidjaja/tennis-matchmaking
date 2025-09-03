interface MMRResult {
  winnerChange: number;
  loserChange: number;
}

/**
 * Calculate MMR changes based on ELO rating system
 * @param winnerMmr Current MMR of winning team
 * @param loserMmr Current MMR of losing team
 * @param kFactor K-factor for rating change sensitivity (default: 32)
 * @returns Object containing MMR changes for winner and loser
 */
export function calculateMMRChange(
  winnerMmr: number, 
  loserMmr: number, 
  kFactor: number = 32
): MMRResult {
  // Calculate expected scores using ELO formula
  const expectedWinner = 1 / (1 + Math.pow(10, (loserMmr - winnerMmr) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerMmr - loserMmr) / 400));
  
  // Actual scores: winner gets 1, loser gets 0
  const actualWinner = 1;
  const actualLoser = 0;
  
  // Calculate rating changes
  const winnerChange = Math.round(kFactor * (actualWinner - expectedWinner));
  const loserChange = Math.round(kFactor * (actualLoser - expectedLoser));
  
  return {
    winnerChange,
    loserChange
  };
}

/**
 * Calculate match competitiveness based on team MMR difference
 * @param team1Mmr MMR of team 1
 * @param team2Mmr MMR of team 2
 * @returns Competitiveness score from 0 to 100 (100 being most competitive)
 */
export function calculateMatchCompetitiveness(team1Mmr: number, team2Mmr: number): number {
  const mmrDifference = Math.abs(team1Mmr - team2Mmr);
  
  // Maximum difference where match is still considered competitive
  const maxCompetitiveDifference = 200;
  
  if (mmrDifference >= maxCompetitiveDifference) {
    return 0;
  }
  
  // Linear scale from 100 (no difference) to 0 (max difference)
  return Math.round(100 * (1 - mmrDifference / maxCompetitiveDifference));
}

/**
 * Get match competitiveness label based on score
 * @param competitivenessScore Score from calculateMatchCompetitiveness
 * @returns String label describing competitiveness
 */
export function getCompetitivenessLabel(competitivenessScore: number): string {
  if (competitivenessScore >= 80) return 'Highly Competitive';
  if (competitivenessScore >= 60) return 'Competitive';
  if (competitivenessScore >= 40) return 'Somewhat Competitive';
  if (competitivenessScore >= 20) return 'Less Competitive';
  return 'Not Competitive';
}

/**
 * Calculate win probability for team1 against team2
 * @param team1Mmr MMR of team 1
 * @param team2Mmr MMR of team 2
 * @returns Win probability for team1 (0-1)
 */
export function calculateWinProbability(team1Mmr: number, team2Mmr: number): number {
  return 1 / (1 + Math.pow(10, (team2Mmr - team1Mmr) / 400));
}