import { NextResponse } from 'next/server';
import TennisTinderDB from '@/lib/database';
import { calculateMMRChange } from '@/lib/mmr';

export async function GET() {
  const db = new TennisTinderDB();
  
  try {
    const matches = await db.getAllMatches();
    return NextResponse.json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
  } finally {
    await db.close();
  }
}

export async function POST(request: Request) {
  const db = new TennisTinderDB();
  
  try {
    const { team1Id, team2Id, winnerTeamId } = await request.json();
    
    if (!team1Id || !team2Id || !winnerTeamId) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    
    if (team1Id === team2Id) {
      return NextResponse.json({ error: 'Teams must be different' }, { status: 400 });
    }
    
    if (winnerTeamId !== team1Id && winnerTeamId !== team2Id) {
      return NextResponse.json({ error: 'Winner must be one of the selected teams' }, { status: 400 });
    }
    
    // Get team details
    const team1 = await db.getTeamWithPlayers(team1Id);
    const team2 = await db.getTeamWithPlayers(team2Id);
    
    if (!team1 || !team2) {
      return NextResponse.json({ error: 'One or both teams not found' }, { status: 404 });
    }
    
    // Ensure teams are from the same group
    if (team1.group_name !== team2.group_name) {
      return NextResponse.json({ error: 'Teams must be from the same group' }, { status: 400 });
    }
    
    // Calculate MMR changes
    const isTeam1Winner = winnerTeamId === team1Id;
    const winnerMmr = isTeam1Winner ? team1.team_mmr : team2.team_mmr;
    const loserMmr = isTeam1Winner ? team2.team_mmr : team1.team_mmr;
    
    const mmrChange = calculateMMRChange(winnerMmr, loserMmr);
    
    // Create match record
    const matchId = await db.createMatch(team1Id, team2Id);
    await db.recordMatchResult(matchId, winnerTeamId, mmrChange.winnerChange);
    
    // Update player stats
    const winnerTeam = isTeam1Winner ? team1 : team2;
    const loserTeam = isTeam1Winner ? team2 : team1;
    
    // Update winner players
    await db.updatePlayerStats(winnerTeam.player1_id, mmrChange.winnerChange, true);
    await db.updatePlayerStats(winnerTeam.player2_id, mmrChange.winnerChange, true);
    
    // Update loser players
    await db.updatePlayerStats(loserTeam.player1_id, mmrChange.loserChange, false);
    await db.updatePlayerStats(loserTeam.player2_id, mmrChange.loserChange, false);
    
    // Update team MMRs
    const newWinnerTeamMmr = winnerTeam.team_mmr + mmrChange.winnerChange;
    const newLoserTeamMmr = loserTeam.team_mmr + mmrChange.loserChange;
    
    await db.updateTeamMmr(winnerTeam.id, newWinnerTeamMmr);
    await db.updateTeamMmr(loserTeam.id, newLoserTeamMmr);
    
    return NextResponse.json({ 
      success: true, 
      matchId,
      mmrChanges: {
        winner: mmrChange.winnerChange,
        loser: mmrChange.loserChange
      }
    });
  } catch (error: unknown) {
    console.error('Error recording match:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to record match';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    await db.close();
  }
}