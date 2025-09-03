'use client';

import { useState, useEffect } from 'react';
import { Player, Team } from '@/lib/database';

interface LeaderboardProps {
  refreshKey: number;
}

interface TeamWithPlayers extends Team {
  player1_name: string;
  player2_name: string;
  group_name: string;
}

export default function Leaderboard({ refreshKey }: LeaderboardProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TeamWithPlayers[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<'A' | 'B'>('A');
  const [viewType, setViewType] = useState<'players' | 'teams'>('players');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const fetchData = async () => {
    try {
      const [playersRes, teamsRes] = await Promise.all([
        fetch('/api/players'),
        fetch('/api/teams-with-players')
      ]);
      
      const playersData = await playersRes.json();
      const teamsData = await teamsRes.json();
      
      setPlayers(playersData);
      setTeams(teamsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players
    .filter(player => player.group === selectedGroup)
    .sort((a, b) => b.mmr - a.mmr);

  const filteredTeams = teams
    .filter(team => team.group_name === selectedGroup && team.active_status)
    .sort((a, b) => b.team_mmr - a.team_mmr);

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (rank === 2) return 'bg-gray-100 text-gray-800 border-gray-300';
    if (rank === 3) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading) {
    return <div className="text-center py-8">Loading leaderboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Leaderboard</h2>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Group Selection */}
          <div className="flex space-x-2">
            {[
              { id: 'A', name: 'Group A' },
              { id: 'B', name: 'Group B' }
            ].map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group.id as 'A' | 'B')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  selectedGroup === group.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {group.name}
              </button>
            ))}
          </div>

          {/* View Type Selection */}
          <div className="flex space-x-2">
            {[
              { id: 'players', name: 'Players' },
              { id: 'teams', name: 'Teams' }
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setViewType(type.id as 'players' | 'teams')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  viewType === type.id
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Players Leaderboard */}
      {viewType === 'players' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Player Rankings - Group {selectedGroup}
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredPlayers.map((player, index) => {
              const rank = index + 1;
              return (
                <div key={player.id} className="px-6 py-4 flex items-center space-x-4">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 font-semibold ${getRankBadgeColor(rank)}`}>
                    {getRankIcon(rank)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-medium text-gray-900 truncate">
                        {player.name}
                      </h4>
                      <div className="text-2xl font-bold text-blue-600">
                        {player.mmr}
                      </div>
                    </div>
                    
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                      <span className="text-green-600 font-medium">
                        {player.wins}W
                      </span>
                      <span className="text-red-600 font-medium">
                        {player.losses}L
                      </span>
                      <span className="font-medium">
                        {player.matches_played > 0 
                          ? `${Math.round((player.wins / player.matches_played) * 100)}% WR`
                          : '0% WR'
                        }
                      </span>
                      <span className="text-gray-500">
                        {player.matches_played} matches
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {filteredPlayers.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              No players found for Group {selectedGroup}
            </div>
          )}
        </div>
      )}

      {/* Teams Leaderboard */}
      {viewType === 'teams' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Team Rankings - Group {selectedGroup}
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredTeams.map((team, index) => {
              const rank = index + 1;
              return (
                <div key={team.id} className="px-6 py-4 flex items-center space-x-4">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 font-semibold ${getRankBadgeColor(rank)}`}>
                    {getRankIcon(rank)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-medium text-gray-900">
                        {team.player1_name} & {team.player2_name}
                      </h4>
                      <div className="text-2xl font-bold text-purple-600">
                        {team.team_mmr}
                      </div>
                    </div>
                    
                    <div className="mt-1 text-sm text-gray-600">
                      <span className="font-medium">Team #{team.id}</span>
                      <span className="mx-2">•</span>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        team.active_status 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {team.active_status ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {filteredTeams.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              No active teams found for Group {selectedGroup}
            </div>
          )}
        </div>
      )}

      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-900 mb-2">Highest MMR</h4>
          {filteredPlayers.length > 0 && (
            <div>
              <p className="text-2xl font-bold text-blue-600">{filteredPlayers[0].mmr}</p>
              <p className="text-sm text-gray-600">{filteredPlayers[0].name}</p>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-900 mb-2">Average MMR</h4>
          {filteredPlayers.length > 0 && (
            <div>
              <p className="text-2xl font-bold text-green-600">
                {Math.round(filteredPlayers.reduce((sum, p) => sum + p.mmr, 0) / filteredPlayers.length)}
              </p>
              <p className="text-sm text-gray-600">Group {selectedGroup}</p>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-900 mb-2">Most Active</h4>
          {filteredPlayers.length > 0 && (
            <div>
              {(() => {
                const mostActive = filteredPlayers.reduce((max, p) => 
                  p.matches_played > max.matches_played ? p : max
                );
                return (
                  <>
                    <p className="text-2xl font-bold text-purple-600">{mostActive.matches_played}</p>
                    <p className="text-sm text-gray-600">{mostActive.name}</p>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}