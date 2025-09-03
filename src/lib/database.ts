import { Pool } from 'pg';

interface Player {
  id: number;
  name: string;
  group: 'A' | 'B';
  mmr: number;
  wins: number;
  losses: number;
  matches_played: number;
}

interface Team {
  id: number;
  player1_id: number;
  player2_id: number | null;
  team_mmr: number;
  active_status: boolean;
}

interface Match {
  id: number;
  team1_id: number;
  team2_id: number;
  winner_team_id: number | null;
  mmr_change: number;
  date: string;
}

class TennisTinderDB {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'switchyard.proxy.rlwy.net',
      port: parseInt(process.env.DB_PORT || '16205'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'htjBSAYnRFRuNITNdyaMNLiDXzQXqbWL',
      database: process.env.DB_NAME || 'tennis-matchmaking',
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });
    // Note: We don't call initializeTables() here since it's async and constructors can't be async
    // Tables should be created via migration script
  }


  // Player methods
  async getAllPlayers(): Promise<Player[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT id, name, group_name as "group", mmr, wins, losses, matches_played FROM players ORDER BY mmr DESC');
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getPlayersByGroup(group: 'A' | 'B'): Promise<Player[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT id, name, group_name as "group", mmr, wins, losses, matches_played FROM players WHERE group_name = $1 ORDER BY mmr DESC', [group]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async addPlayer(name: string, group: 'A' | 'B'): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('INSERT INTO players (name, group_name) VALUES ($1, $2)', [name, group]);
    } finally {
      client.release();
    }
  }

  async updatePlayerStats(playerId: number, mmrChange: number, isWin: boolean): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        UPDATE players 
        SET mmr = mmr + $1, 
            wins = wins + $2, 
            losses = losses + $3, 
            matches_played = matches_played + 1 
        WHERE id = $4
      `, [mmrChange, isWin ? 1 : 0, isWin ? 0 : 1, playerId]);
    } finally {
      client.release();
    }
  }

  // Team methods
  async getAllTeams(): Promise<Team[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM teams WHERE active_status = TRUE');
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getTeamsByGroup(group: 'A' | 'B'): Promise<Team[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT t.* FROM teams t
        JOIN players p1 ON t.player1_id = p1.id
        WHERE p1.group_name = $1 AND t.active_status = TRUE
      `, [group]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async createTeam(player1Id: number, player2Id?: number): Promise<number> {
    const client = await this.pool.connect();
    try {
      // For singles matches, player2Id will be undefined/null
      const isDoublesMatch = player2Id !== undefined && player2Id !== null;
      
      if (isDoublesMatch) {
        // Doubles match: get both players to ensure they're in the same group and calculate team MMR
        const playerResult = await client.query('SELECT id, mmr, group_name FROM players WHERE id = $1 OR id = $2', [player1Id, player2Id]);
        const players = playerResult.rows;
        
        const player1 = players.find(p => p.id === player1Id);
        const player2 = players.find(p => p.id === player2Id);

        if (!player1 || !player2) {
          throw new Error('One or both players not found');
        }

        if (player1.group_name !== player2.group_name) {
          throw new Error('Players must be in the same group');
        }

        const teamMmr = Math.round((player1.mmr + player2.mmr) / 2);
        const result = await client.query('INSERT INTO teams (player1_id, player2_id, team_mmr) VALUES ($1, $2, $3) RETURNING id', [player1Id, player2Id, teamMmr]);
        return result.rows[0].id;
      } else {
        // Singles match: only get player1 and use their MMR as team MMR
        const playerResult = await client.query('SELECT id, mmr, group_name FROM players WHERE id = $1', [player1Id]);
        const player1 = playerResult.rows[0];

        if (!player1) {
          throw new Error('Player not found');
        }

        const result = await client.query('INSERT INTO teams (player1_id, player2_id, team_mmr) VALUES ($1, $2, $3) RETURNING id', [player1Id, null, player1.mmr]);
        return result.rows[0].id;
      }
    } finally {
      client.release();
    }
  }

  async getTeamWithPlayers(teamId: number) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          t.*,
          p1.name as player1_name,
          p1.group_name as group_name,
          p2.name as player2_name
        FROM teams t
        JOIN players p1 ON t.player1_id = p1.id
        LEFT JOIN players p2 ON t.player2_id = p2.id
        WHERE t.id = $1
      `, [teamId]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updateTeamMmr(teamId: number, newMmr: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('UPDATE teams SET team_mmr = $1 WHERE id = $2', [newMmr, teamId]);
    } finally {
      client.release();
    }
  }

  // Match methods
  async createMatch(team1Id: number, team2Id: number): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('INSERT INTO matches (team1_id, team2_id) VALUES ($1, $2) RETURNING id', [team1Id, team2Id]);
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  async recordMatchResult(matchId: number, winnerTeamId: number, mmrChange: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('UPDATE matches SET winner_team_id = $1, mmr_change = $2 WHERE id = $3', [winnerTeamId, mmrChange, matchId]);
    } finally {
      client.release();
    }
  }

  async getAllMatches() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          m.*,
          t1p1.name as team1_player1,
          t1p2.name as team1_player2,
          t2p1.name as team2_player1,
          t2p2.name as team2_player2
        FROM matches m
        JOIN teams t1 ON m.team1_id = t1.id
        JOIN teams t2 ON m.team2_id = t2.id
        JOIN players t1p1 ON t1.player1_id = t1p1.id
        LEFT JOIN players t1p2 ON t1.player2_id = t1p2.id
        JOIN players t2p1 ON t2.player1_id = t2p1.id
        LEFT JOIN players t2p2 ON t2.player2_id = t2p2.id
        ORDER BY m.date DESC
      `);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export default TennisTinderDB;
export type { Player, Team, Match };