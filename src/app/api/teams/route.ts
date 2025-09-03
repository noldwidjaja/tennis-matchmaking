import { NextResponse } from 'next/server';
import TennisTinderDB from '@/lib/database';

export async function GET() {
  const db = new TennisTinderDB();
  
  try {
    const teams = await db.getAllTeams();
    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  } finally {
    await db.close();
  }
}

export async function POST(request: Request) {
  const db = new TennisTinderDB();
  
  try {
    const { player1Id, player2Id } = await request.json();
    
    if (!player1Id || !player2Id) {
      return NextResponse.json({ error: 'Both player IDs are required' }, { status: 400 });
    }
    
    if (player1Id === player2Id) {
      return NextResponse.json({ error: 'Players must be different' }, { status: 400 });
    }
    
    const teamId = await db.createTeam(player1Id, player2Id);
    const team = await db.getTeamWithPlayers(teamId);
    
    return NextResponse.json({ success: true, team });
  } catch (error: unknown) {
    console.error('Error creating team:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create team';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    await db.close();
  }
}