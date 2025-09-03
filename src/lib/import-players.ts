import TennisTinderDB from './database';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function importPlayersFromCSV(): Promise<void> {
  const db = new TennisTinderDB();
  
  try {
    const csvPath = join(process.cwd(), 'data.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    // Skip the header (A,B)
    const dataLines = lines.slice(1);
    
    for (const line of dataLines) {
      const [playerA, playerB] = line.split(',');
      
      if (playerA && playerA.trim()) {
        await db.addPlayer(playerA.trim(), 'A');
      }
      
      if (playerB && playerB.trim()) {
        await db.addPlayer(playerB.trim(), 'B');
      }
    }
    
    console.log(`Successfully imported ${dataLines.length * 2} players`);
    
    const groupAPlayers = await db.getPlayersByGroup('A');
    const groupBPlayers = await db.getPlayersByGroup('B');
    
    console.log(`Group A: ${groupAPlayers.length} players`);
    console.log(`Group B: ${groupBPlayers.length} players`);
    
  } catch (error) {
    console.error('Error importing players:', error);
  } finally {
    await db.close();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  importPlayersFromCSV();
}