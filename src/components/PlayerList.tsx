'use client';

import { useState, useEffect } from 'react';
import { Player } from '@/lib/database';

interface PlayerListProps {
  refreshKey: number;
}

export default function PlayerList({ refreshKey }: PlayerListProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<'all' | 'A' | 'B'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayers();
  }, [refreshKey]);

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players');
      const data = await response.json();
      setPlayers(data);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(player => 
    selectedGroup === 'all' || player.group === selectedGroup
  );

  if (loading) {
    return <div className="text-center py-8">Loading players...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Player Management</h2>
        
        {/* Group Filter */}
        <div className="flex space-x-2 mb-6">
          {[
            { id: 'all', name: 'All Players' },
            { id: 'A', name: 'Group A' },
            { id: 'B', name: 'Group B' }
          ].map((group) => (
            <button
              key={group.id}
              onClick={() => setSelectedGroup(group.id as 'all' | 'A' | 'B')}
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

      {/* Players Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlayers.map((player) => (
          <div key={player.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{player.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                player.group === 'A' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                Group {player.group}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 text-sm">MMR</span>
                <span className="font-semibold text-lg">{player.mmr}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 text-sm">Wins</span>
                <span className="text-green-600 font-medium">{player.wins}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 text-sm">Losses</span>
                <span className="text-red-600 font-medium">{player.losses}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 text-sm">Win Rate</span>
                <span className="font-medium">
                  {player.matches_played > 0 
                    ? `${Math.round((player.wins / player.matches_played) * 100)}%`
                    : '0%'
                  }
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 text-sm">Total Matches</span>
                <span className="font-medium">{player.matches_played}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPlayers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No players found for the selected group.</p>
        </div>
      )}
    </div>
  );
}