'use client';

import { useState, useEffect } from 'react';

interface MatchHistoryProps {
  refreshKey: number;
}

interface Match {
  id: number;
  team1_id: number;
  team2_id: number;
  winner_team_id: number;
  mmr_change: number;
  date: string;
  team1_player1: string;
  team1_player2: string;
  team2_player1: string;
  team2_player2: string;
}

export default function MatchHistory({ refreshKey }: MatchHistoryProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, [refreshKey]);

  const fetchMatches = async () => {
    try {
      const response = await fetch('/api/matches');
      const data = await response.json();
      setMatches(data);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="text-center py-8">Loading match history...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Match History</h2>
        <p className="text-gray-600 mb-6">
          Complete record of all matches played ({matches.length} total)
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-lg">No matches recorded yet</p>
          <p className="text-gray-400 text-sm mt-2">Start by creating teams and recording matches!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => {
            const isTeam1Winner = match.winner_team_id === match.team1_id;
            
            return (
              <div key={match.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-gray-500">
                    Match #{match.id} • {formatDate(match.date)}
                  </div>
                  <div className="text-sm font-medium text-gray-700">
                    MMR Change: ±{match.mmr_change}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  {/* Team 1 */}
                  <div className={`text-center p-4 rounded-lg border-2 ${
                    isTeam1Winner 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-red-300 bg-red-50'
                  }`}>
                    <div className="font-semibold text-gray-900 mb-1">
                      {match.team1_player1} & {match.team1_player2}
                    </div>
                    <div className={`text-sm font-medium ${
                      isTeam1Winner ? 'text-green-700' : 'text-red-700'
                    }`}>
                      Team {match.team1_id} • {isTeam1Winner ? 'WINNER' : 'LOSER'}
                    </div>
                    <div className={`text-xs mt-1 ${
                      isTeam1Winner ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isTeam1Winner ? `+${match.mmr_change}` : `${-match.mmr_change}`} MMR
                    </div>
                  </div>

                  {/* VS */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-400">VS</div>
                  </div>

                  {/* Team 2 */}
                  <div className={`text-center p-4 rounded-lg border-2 ${
                    !isTeam1Winner 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-red-300 bg-red-50'
                  }`}>
                    <div className="font-semibold text-gray-900 mb-1">
                      {match.team2_player1} & {match.team2_player2}
                    </div>
                    <div className={`text-sm font-medium ${
                      !isTeam1Winner ? 'text-green-700' : 'text-red-700'
                    }`}>
                      Team {match.team2_id} • {!isTeam1Winner ? 'WINNER' : 'LOSER'}
                    </div>
                    <div className={`text-xs mt-1 ${
                      !isTeam1Winner ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {!isTeam1Winner ? `+${match.mmr_change}` : `${-match.mmr_change}`} MMR
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Statistics */}
      {matches.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{matches.length}</p>
              <p className="text-sm text-gray-600">Total Matches</p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {matches.length > 0 
                  ? Math.round(matches.reduce((sum, m) => sum + m.mmr_change, 0) / matches.length)
                  : 0
                }
              </p>
              <p className="text-sm text-gray-600">Avg MMR Change</p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {matches.length > 0 ? Math.max(...matches.map(m => m.mmr_change)) : 0}
              </p>
              <p className="text-sm text-gray-600">Highest MMR Change</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}