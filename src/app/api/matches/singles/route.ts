import { NextResponse } from 'next/server';
import TennisTinderDB from '@/lib/database';
import { calculateMMRChange } from '@/lib/mmr';

export async function POST(request: Request) {
  const db = new TennisTinderDB();
  
  try {
    const { player1, player2, winner } = await request.json();
    
    if (!player1 || !player2 || !winner) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    
    if (winner !== 1 && winner !== 2) {
      return NextResponse.json({ error: 'Winner must be player 1 or player 2' }, { status: 400 });
    }
    
    // Get player details
    const players = await db.getAllPlayers();
    const playerData1 = players.find(p => p.id === player1.id);
    const playerData2 = players.find(p => p.id === player2.id);
    
    if (!playerData1 || !playerData2) {
      return NextResponse.json({ error: 'One or both players not found' }, { status: 404 });
    }
    
    // Ensure players are different
    if (player1.id === player2.id) {
      return NextResponse.json({ error: 'Players must be different' }, { status: 400 });
    }
    
    // Calculate MMR changes
    const isPlayer1Winner = winner === 1;
    const winnerMmr = isPlayer1Winner ? playerData1.mmr : playerData2.mmr;
    const loserMmr = isPlayer1Winner ? playerData2.mmr : playerData1.mmr;
    
    const mmrChange = calculateMMRChange(winnerMmr, loserMmr);
    
    // Create match record directly with player references (singles)
    const matchId = await db.createMatch(
      'singles',
      player1.id,
      player2.id,
      isPlayer1Winner ? 1 : 2,
      mmrChange.winnerChange
    );
    
    // Update player stats
    if (isPlayer1Winner) {
      // Player 1 wins
      await db.updatePlayerStats(player1.id, mmrChange.winnerChange, true);
      await db.updatePlayerStats(player2.id, mmrChange.loserChange, false);
    } else {
      // Player 2 wins
      await db.updatePlayerStats(player2.id, mmrChange.winnerChange, true);
      await db.updatePlayerStats(player1.id, mmrChange.loserChange, false);
    }
    
    return NextResponse.json({ 
      success: true, 
      matchId,
      mmrChanges: {
        winner: mmrChange.winnerChange,
        loser: mmrChange.loserChange
      },
      match: {
        player1: playerData1.name,
        player2: playerData2.name,
        winner: isPlayer1Winner ? 1 : 2
      }
    });
  } catch (error: unknown) {
    console.error('Error recording singles match:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to record singles match';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    await db.close();
  }
}