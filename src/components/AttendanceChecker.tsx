'use client';

import { useState, useEffect } from 'react';
import { Player } from '@/lib/database';

interface AttendanceCheckerProps {
  refreshKey: number;
}

export default function AttendanceChecker({ refreshKey }: AttendanceCheckerProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendance, setAttendance] = useState<Set<number>>(new Set());
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

  const toggleAttendance = (playerId: number) => {
    const newAttendance = new Set(attendance);
    if (newAttendance.has(playerId)) {
      newAttendance.delete(playerId);
    } else {
      newAttendance.add(playerId);
    }
    setAttendance(newAttendance);
    
    // Store in localStorage for persistence
    localStorage.setItem('tennis-attendance', JSON.stringify(Array.from(newAttendance)));
  };

  const selectAllGroup = (group: 'A' | 'B') => {
    const groupPlayers = players.filter(player => player.group === group);
    const newAttendance = new Set(attendance);
    groupPlayers.forEach(player => newAttendance.add(player.id));
    setAttendance(newAttendance);
    localStorage.setItem('tennis-attendance', JSON.stringify(Array.from(newAttendance)));
  };

  const clearAllGroup = (group: 'A' | 'B') => {
    const groupPlayers = players.filter(player => player.group === group);
    const newAttendance = new Set(attendance);
    groupPlayers.forEach(player => newAttendance.delete(player.id));
    setAttendance(newAttendance);
    localStorage.setItem('tennis-attendance', JSON.stringify(Array.from(newAttendance)));
  };

  const clearAll = () => {
    setAttendance(new Set());
    localStorage.removeItem('tennis-attendance');
  };

  // Load attendance from localStorage on component mount
  useEffect(() => {
    const savedAttendance = localStorage.getItem('tennis-attendance');
    if (savedAttendance) {
      try {
        const attendanceArray = JSON.parse(savedAttendance);
        setAttendance(new Set(attendanceArray));
      } catch (error) {
        console.error('Error loading attendance from localStorage:', error);
      }
    }
  }, []);

  const filteredPlayers = players.filter(player => 
    selectedGroup === 'all' || player.group === selectedGroup
  );

  const getAttendanceStats = () => {
    const groupA = players.filter(p => p.group === 'A');
    const groupB = players.filter(p => p.group === 'B');
    const groupAPresent = groupA.filter(p => attendance.has(p.id)).length;
    const groupBPresent = groupB.filter(p => attendance.has(p.id)).length;
    
    return {
      totalPresent: attendance.size,
      groupA: { present: groupAPresent, total: groupA.length },
      groupB: { present: groupBPresent, total: groupB.length }
    };
  };

  if (loading) {
    return <div className="text-center py-8">Loading players...</div>;
  }

  const stats = getAttendanceStats();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Attendance Checker</h2>
        <p className="text-gray-600 mb-6">
          Check off players who are present today. Only present players will be included in random matchmaking.
        </p>

        {/* Attendance Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900">Total Present</h3>
            <p className="text-2xl font-bold text-green-700">{stats.totalPresent}</p>
            <p className="text-sm text-green-600">out of {players.length} players</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900">Group A Present</h3>
            <p className="text-2xl font-bold text-blue-700">{stats.groupA.present}</p>
            <p className="text-sm text-blue-600">out of {stats.groupA.total} players</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-900">Group B Present</h3>
            <p className="text-2xl font-bold text-purple-700">{stats.groupB.present}</p>
            <p className="text-sm text-purple-600">out of {stats.groupB.total} players</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Group Filter */}
          <div className="flex space-x-2">
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

          {/* Bulk Actions */}
          <div className="flex space-x-2">
            {selectedGroup === 'A' && (
              <>
                <button
                  onClick={() => selectAllGroup('A')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors"
                >
                  ✓ All Group A
                </button>
                <button
                  onClick={() => clearAllGroup('A')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition-colors"
                >
                  ✗ Clear Group A
                </button>
              </>
            )}
            {selectedGroup === 'B' && (
              <>
                <button
                  onClick={() => selectAllGroup('B')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors"
                >
                  ✓ All Group B
                </button>
                <button
                  onClick={() => clearAllGroup('B')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition-colors"
                >
                  ✗ Clear Group B
                </button>
              </>
            )}
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium text-sm hover:bg-gray-700 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Player Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredPlayers.map((player) => {
          const isPresent = attendance.has(player.id);
          return (
            <label
              key={player.id}
              className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                isPresent
                  ? 'border-green-300 bg-green-50 text-green-900'
                  : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
              }`}
            >
              <input
                type="checkbox"
                checked={isPresent}
                onChange={() => toggleAttendance(player.id)}
                className="mr-3 h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{player.name}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    player.group === 'A' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    Group {player.group}
                  </span>
                </div>
                <div className="text-sm opacity-75 mt-1">
                  MMR: {player.mmr} • {player.wins}W/{player.losses}L
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {filteredPlayers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No players found for the selected group.</p>
        </div>
      )}

      {/* Matching Requirements Warning */}
      {stats.totalPresent > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-medium text-amber-900 mb-2">Random Match Requirements:</h4>
          <div className="text-sm text-amber-800 space-y-1">
            <p>• Group A: Need at least 4 present players for random matches ({stats.groupA.present >= 4 ? '✓' : '✗'} {stats.groupA.present}/4)</p>
            <p>• Group B: Need at least 4 present players for random matches ({stats.groupB.present >= 4 ? '✓' : '✗'} {stats.groupB.present}/4)</p>
            {stats.groupA.present >= 4 && (
              <p className="text-green-700 font-medium">✓ Group A ready for random matches!</p>
            )}
            {stats.groupB.present >= 4 && (
              <p className="text-green-700 font-medium">✓ Group B ready for random matches!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}