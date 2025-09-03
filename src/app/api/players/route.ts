import { NextResponse } from 'next/server';
import TennisTinderDB from '@/lib/database';

export async function GET() {
  const db = new TennisTinderDB();
  
  try {
    const players = await db.getAllPlayers();
    return NextResponse.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  } finally {
    await db.close();
  }
}