import { NextResponse } from 'next/server';
import TennisTinderDB from '@/lib/database';

export async function GET() {
  const db = new TennisTinderDB();
  
  try {
    const teams = await db.getAllTeams();
    const teamsWithPlayers = await Promise.all(
      teams.map(async (team) => {
        return await db.getTeamWithPlayers(team.id);
      })
    );
    
    return NextResponse.json(teamsWithPlayers);
  } catch (error) {
    console.error('Error fetching teams with players:', error);
    return NextResponse.json({ error: 'Failed to fetch teams with players' }, { status: 500 });
  } finally {
    await db.close();
  }
}