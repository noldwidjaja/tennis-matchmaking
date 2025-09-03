'use client';

import { useState, useEffect } from 'react';
import { Player, Team, Match } from '@/lib/database';
import PlayerList from '@/components/PlayerList';
import AttendanceChecker from '@/components/AttendanceChecker';
import MatchRecorder from '@/components/MatchRecorder';
import Leaderboard from '@/components/Leaderboard';
import MatchHistory from '@/components/MatchHistory';

export default function TennisTinderAdmin() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [players, setPlayers] = useState<Player[]>([]);
  const [, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '🏠' },
    { id: 'players', name: 'Players', icon: '👤' },
    { id: 'attendance', name: 'Attendance', icon: '✅' },
    { id: 'match', name: 'Match', icon: '🎾' },
    { id: 'leaderboard', name: 'Rankings', icon: '🏆' },
    { id: 'history', name: 'History', icon: '📜' }
  ];

  const refreshData = () => setRefreshKey(prev => prev + 1);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [playersRes, teamsRes, matchesRes] = await Promise.all([
          fetch('/api/players'),
          fetch('/api/teams'),
          fetch('/api/matches')
        ]);
        
        const playersData = await playersRes.json();
        const teamsData = await teamsRes.json();
        const matchesData = await matchesRes.json();
        
        setPlayers(playersData);
        setTeams(teamsData);
        setMatches(matchesData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, [refreshKey]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">🎾 Tennis Tinder Admin</h1>
              <p className="text-gray-600">Manage doubles matches and rankings</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900">Total Players</h3>
                <p className="text-2xl font-bold text-blue-700">{players.length}</p>
                <p className="text-sm text-blue-600">
                  {players.filter(p => p.group === 'A').length} in Group A, {players.filter(p => p.group === 'B').length} in Group B
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-900">Matches Played</h3>
                <p className="text-2xl font-bold text-purple-700">{matches.length}</p>
                <p className="text-sm text-purple-600">Total completed</p>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2">Quick Actions</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab('attendance')}
                  className="px-3 py-2 bg-yellow-200 text-yellow-900 rounded-lg text-sm font-medium hover:bg-yellow-300 transition-colors"
                >
                  Check Attendance
                </button>
                <button
                  onClick={() => setActiveTab('match')}
                  className="px-3 py-2 bg-yellow-200 text-yellow-900 rounded-lg text-sm font-medium hover:bg-yellow-300 transition-colors"
                >
                  Record Match
                </button>
                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className="px-3 py-2 bg-yellow-200 text-yellow-900 rounded-lg text-sm font-medium hover:bg-yellow-300 transition-colors"
                >
                  View Rankings
                </button>
              </div>
            </div>
          </div>
        );
        
      case 'players':
        return <PlayerList refreshKey={refreshKey} />;
        
      case 'attendance':
        return <AttendanceChecker refreshKey={refreshKey} />;
        
      case 'match':
        return <MatchRecorder onMatchRecorded={refreshData} refreshKey={refreshKey} />;
        
      case 'leaderboard':
        return <Leaderboard refreshKey={refreshKey} />;
        
      case 'history':
        return <MatchHistory refreshKey={refreshKey} />;
        
      default:
        return <div>Tab not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Mobile-first navigation */}
        <nav className="bg-white shadow-sm border-b">
          <div className="px-4 py-3">
            <div className="flex space-x-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="p-4">
          {renderActiveTab()}
        </main>
      </div>
    </div>
  );
}