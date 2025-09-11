import { NextResponse } from 'next/server';
import TennisTinderDB from '@/lib/database';
import { calculateMMRChange } from '@/lib/mmr';

export async function POST(request: Request) {
  const db = new TennisTinderDB();
  
  try {
    const { team1, team2, winnerTeam } = await request.json();
    
    if (!team1 || !team2 || !winnerTeam) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    
    if (winnerTeam !== 1 && winnerTeam !== 2) {
      return NextResponse.json({ error: 'Winner must be team 1 or team 2' }, { status: 400 });
    }
    
    // Get player details to ensure they're from the same group
    const players = await db.getAllPlayers();
    const player1_1 = players.find(p => p.id === team1.player1Id);
    const player1_2 = players.find(p => p.id === team1.player2Id);
    const player2_1 = players.find(p => p.id === team2.player1Id);
    const player2_2 = players.find(p => p.id === team2.player2Id);
    
    if (!player1_1 || !player1_2 || !player2_1 || !player2_2) {
      return NextResponse.json({ error: 'One or more players not found' }, { status: 404 });
    }
    
    // Ensure all players are from the same group
    if (player1_1.group !== player1_2.group || 
        player1_1.group !== player2_1.group || 
        player1_1.group !== player2_2.group) {
      return NextResponse.json({ error: 'All players must be from the same group' }, { status: 400 });
    }
    
    // Check for duplicate players - CRITICAL validation
    const playerIds = [team1.player1Id, team1.player2Id, team2.player1Id, team2.player2Id];
    const uniquePlayerIds = new Set(playerIds);
    
    if (uniquePlayerIds.size !== 4) {
      console.error('DUPLICATE PLAYERS DETECTED:', {
        playerIds,
        team1: [team1.player1Id, team1.player2Id],
        team2: [team2.player1Id, team2.player2Id],
        uniqueCount: uniquePlayerIds.size
      });
      return NextResponse.json({ error: 'All players must be different - duplicate players detected' }, { status: 400 });
    }

    // Additional check: ensure no player is paired with themselves
    if (team1.player1Id === team1.player2Id || team2.player1Id === team2.player2Id) {
      console.error('PLAYER PAIRED WITH THEMSELVES:', {
        team1SelfPair: team1.player1Id === team1.player2Id,
        team2SelfPair: team2.player1Id === team2.player2Id,
        team1: [team1.player1Id, team1.player2Id],
        team2: [team2.player1Id, team2.player2Id]
      });
      return NextResponse.json({ error: 'A player cannot be paired with themselves' }, { status: 400 });
    }
    
    // Calculate MMR changes
    const isTeam1Winner = winnerTeam === 1;
    const winnerMmr = isTeam1Winner ? team1.teamMMR : team2.teamMMR;
    const loserMmr = isTeam1Winner ? team2.teamMMR : team1.teamMMR;
    
    const mmrChange = calculateMMRChange(winnerMmr, loserMmr);
    
    // Create match record directly with player references
    const matchId = await db.createMatch(
      'doubles',
      team1.player1Id,
      team2.player1Id, 
      isTeam1Winner ? 1 : 2,
      mmrChange.winnerChange,
      team1.player2Id,
      team2.player2Id
    );
    
    // Update player stats
    if (isTeam1Winner) {
      // Team 1 wins
      await db.updatePlayerStats(team1.player1Id, mmrChange.winnerChange, true);
      await db.updatePlayerStats(team1.player2Id, mmrChange.winnerChange, true);
      await db.updatePlayerStats(team2.player1Id, mmrChange.loserChange, false);
      await db.updatePlayerStats(team2.player2Id, mmrChange.loserChange, false);
    } else {
      // Team 2 wins
      await db.updatePlayerStats(team2.player1Id, mmrChange.winnerChange, true);
      await db.updatePlayerStats(team2.player2Id, mmrChange.winnerChange, true);
      await db.updatePlayerStats(team1.player1Id, mmrChange.loserChange, false);
      await db.updatePlayerStats(team1.player2Id, mmrChange.loserChange, false);
    }
    
    return NextResponse.json({ 
      success: true, 
      matchId,
      mmrChanges: {
        winner: mmrChange.winnerChange,
        loser: mmrChange.loserChange
      },
      teams: {
        team1: `${player1_1.name} & ${player1_2.name}`,
        team2: `${player2_1.name} & ${player2_2.name}`,
        winner: isTeam1Winner ? 1 : 2
      }
    });
  } catch (error: unknown) {
    console.error('Error recording random match:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to record match';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    await db.close();
  }
}