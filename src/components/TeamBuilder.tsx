'use client';

import { useState, useEffect } from 'react';
import { Player, Team } from '@/lib/database';

interface TeamBuilderProps {
  onTeamCreated: () => void;
  refreshKey: number;
}

export default function TeamBuilder({ onTeamCreated, refreshKey }: TeamBuilderProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<'A' | 'B'>('A');
  const [selectedPlayer1, setSelectedPlayer1] = useState<number | null>(null);
  const [selectedPlayer2, setSelectedPlayer2] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const fetchData = async () => {
    try {
      const [playersRes, teamsRes] = await Promise.all([
        fetch('/api/players'),
        fetch('/api/teams')
      ]);
      
      const playersData = await playersRes.json();
      const teamsData = await teamsRes.json();
      
      setPlayers(playersData);
      setTeams(teamsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const createTeam = async () => {
    if (!selectedPlayer1 || !selectedPlayer2) {
      alert('Please select two players');
      return;
    }

    if (selectedPlayer1 === selectedPlayer2) {
      alert('Please select two different players');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          player1Id: selectedPlayer1,
          player2Id: selectedPlayer2
        })
      });

      if (response.ok) {
        setSelectedPlayer1(null);
        setSelectedPlayer2(null);
        onTeamCreated();
        alert('Team created successfully!');
      } else {
        const error = await response.json();
        alert(`Error creating team: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating team:', error);
      alert('Error creating team');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(player => player.group === selectedGroup);
  const groupTeams = teams.filter(team => {
    const teamPlayer = players.find(p => p.id === team.player1_id);
    return teamPlayer?.group === selectedGroup;
  });

  const getPlayerName = (playerId: number) => {
    return players.find(p => p.id === playerId)?.name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Team Builder</h2>
        
        {/* Group Selection */}
        <div className="flex space-x-2 mb-6">
          {[
            { id: 'A', name: 'Group A' },
            { id: 'B', name: 'Group B' }
          ].map((group) => (
            <button
              key={group.id}
              onClick={() => {
                setSelectedGroup(group.id as 'A' | 'B');
                setSelectedPlayer1(null);
                setSelectedPlayer2(null);
              }}
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
      </div>

      {/* Team Creation */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Team (Group {selectedGroup})</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Player 1 Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Player 1</label>
            <select
              value={selectedPlayer1 || ''}
              onChange={(e) => setSelectedPlayer1(e.target.value ? Number(e.target.value) : null)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Player 1</option>
              {filteredPlayers.map((player) => (
                <option key={player.id} value={player.id} disabled={player.id === selectedPlayer2}>
                  {player.name} (MMR: {player.mmr})
                </option>
              ))}
            </select>
          </div>

          {/* Player 2 Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Player 2</label>
            <select
              value={selectedPlayer2 || ''}
              onChange={(e) => setSelectedPlayer2(e.target.value ? Number(e.target.value) : null)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Player 2</option>
              {filteredPlayers.map((player) => (
                <option key={player.id} value={player.id} disabled={player.id === selectedPlayer1}>
                  {player.name} (MMR: {player.mmr})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Team Preview */}
        {selectedPlayer1 && selectedPlayer2 && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Team Preview</h4>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                {getPlayerName(selectedPlayer1)} & {getPlayerName(selectedPlayer2)}
              </span>
              <span className="text-sm text-gray-500">
                Team MMR: {Math.round((
                  (players.find(p => p.id === selectedPlayer1)?.mmr || 0) +
                  (players.find(p => p.id === selectedPlayer2)?.mmr || 0)
                ) / 2)}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={createTeam}
          disabled={!selectedPlayer1 || !selectedPlayer2 || loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating Team...' : 'Create Team'}
        </button>
      </div>

      {/* Existing Teams */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Existing Teams - Group {selectedGroup} ({groupTeams.length})
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupTeams.map((team) => (
            <div key={team.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Team #{team.id}</h4>
                <span className="text-lg font-semibold text-blue-600">{team.team_mmr}</span>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-gray-700">{getPlayerName(team.player1_id)}</p>
                <p className="text-sm text-gray-700">{getPlayerName(team.player2_id)}</p>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  team.active_status 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {team.active_status ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {groupTeams.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No teams created yet for Group {selectedGroup}</p>
          </div>
        )}
      </div>
    </div>
  );
}