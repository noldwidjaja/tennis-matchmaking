'use client';

import { useState, useEffect, useCallback } from 'react';
import { Player, Team } from '@/lib/database';
import { calculateMMRChange, calculateMatchCompetitiveness, getCompetitivenessLabel, calculateWinProbability } from '@/lib/mmr';

interface TeamWithPlayers extends Team {
  player1_name: string;
  player2_name: string;
  group_name: string;
}

interface MatchRecorderProps {
  onMatchRecorded: () => void;
  refreshKey: number;
}

export default function MatchRecorder({ onMatchRecorded, refreshKey }: MatchRecorderProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TeamWithPlayers[]>([]);
  const [matchType, setMatchType] = useState<'doubles' | 'singles'>('doubles');
  const [selectedGroup, setSelectedGroup] = useState<'A' | 'B' | 'ALL'>('A');
  const [selectedTeam1, setSelectedTeam1] = useState<number | null>(null);
  const [selectedTeam2, setSelectedTeam2] = useState<number | null>(null);
  const [winnerTeam, setWinnerTeam] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [randomTeam1, setRandomTeam1] = useState<{player1: Player, player2: Player, teamMMR: number} | null>(null);
  const [randomTeam2, setRandomTeam2] = useState<{player1: Player, player2: Player, teamMMR: number} | null>(null);
  const [randomPlayer1, setRandomPlayer1] = useState<Player | null>(null);
  const [randomPlayer2, setRandomPlayer2] = useState<Player | null>(null);
  const [presentCount, setPresentCount] = useState<{A: number, B: number}>({A: 0, B: 0});

  const updatePresentCount = useCallback(() => {
    const savedAttendance = localStorage.getItem('tennis-attendance');
    if (savedAttendance && players.length > 0) {
      try {
        const attendanceArray = JSON.parse(savedAttendance);
        const presentIds = new Set(attendanceArray);
        const groupAPresent = players.filter(p => p.group === 'A' && presentIds.has(p.id)).length;
        const groupBPresent = players.filter(p => p.group === 'B' && presentIds.has(p.id)).length;
        setPresentCount({ A: groupAPresent, B: groupBPresent });
      } catch (error) {
        console.error('Error loading attendance:', error);
        setPresentCount({ A: 0, B: 0 });
      }
    } else {
      setPresentCount({ A: 0, B: 0 });
    }
  }, [players]);

  useEffect(() => {
    fetchData();
    updatePresentCount();
  }, [refreshKey, players, updatePresentCount]);

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
    }
  };

  const generateRandomMatch = () => {
    // Get attendance from localStorage
    const savedAttendance = localStorage.getItem('tennis-attendance');
    let presentPlayerIds: Set<number> = new Set();
    
    if (savedAttendance) {
      try {
        const attendanceArray = JSON.parse(savedAttendance);
        presentPlayerIds = new Set(attendanceArray);
      } catch (error) {
        console.error('Error loading attendance:', error);
      }
    }
    
    // Filter to only present players based on selection
    let availablePlayers;
    let errorMessage;
    const requiredPlayers = matchType === 'singles' ? 2 : 4;
    
    if (selectedGroup === 'ALL') {
      // Use all present players regardless of group
      availablePlayers = players.filter(player => 
        presentPlayerIds.size === 0 || presentPlayerIds.has(player.id)
      );
      errorMessage = presentPlayerIds.size > 0 
        ? `Need at least ${requiredPlayers} present players to generate a ${matchType} match. Currently ${availablePlayers.length} present. Please check attendance.`
        : `Need at least ${requiredPlayers} players to generate a ${matchType} match`;
    } else {
      // Use only players from selected group
      availablePlayers = players.filter(player => 
        player.group === selectedGroup && 
        (presentPlayerIds.size === 0 || presentPlayerIds.has(player.id))
      );
      errorMessage = presentPlayerIds.size > 0
        ? `Need at least ${requiredPlayers} present players in Group ${selectedGroup} to generate a ${matchType} match. Currently ${availablePlayers.length} present. Please check attendance.`
        : `Need at least ${requiredPlayers} players in Group ${selectedGroup} to generate a ${matchType} match`;
    }
    
    if (availablePlayers.length < requiredPlayers) {
      alert(errorMessage);
      return;
    }

    // Use Fisher-Yates shuffle and pick required distinct players
    const shuffleablePlayers = [...availablePlayers];
    const selectedPlayers: Player[] = [];

    // Manually select required unique players
    for (let i = 0; i < requiredPlayers && shuffleablePlayers.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * shuffleablePlayers.length);
      const selectedPlayer = shuffleablePlayers.splice(randomIndex, 1)[0];
      selectedPlayers.push(selectedPlayer);
    }

    // Final verification - ensure we have exactly the required unique players
    if (selectedPlayers.length !== requiredPlayers) {
      alert(`Error: Could not select ${requiredPlayers} unique players. Please try again.`);
      return;
    }

    const uniqueIds = new Set(selectedPlayers.map(p => p.id));
    if (uniqueIds.size !== requiredPlayers) {
      console.error('CRITICAL BUG: Duplicate players selected!', selectedPlayers.map(p => ({ id: p.id, name: p.name })));
      alert('Error: Duplicate players detected. Please try again.');
      return;
    }

    if (matchType === 'singles') {
      // Singles match - just two players
      const [player1, player2] = selectedPlayers;
      
      console.log('Generated singles match:', {
        player1: player1.name,
        player2: player2.name,
        playerIds: [player1.id, player2.id]
      });

      // Clear any previous doubles match
      setRandomTeam1(null);
      setRandomTeam2(null);
      
      // Set the random players for singles
      setRandomPlayer1(player1);
      setRandomPlayer2(player2);
    } else {
      // Doubles match - four players in two teams
      const [player1, player2, player3, player4] = selectedPlayers;

      // Calculate team MMRs
      const team1MMR = Math.round((player1.mmr + player2.mmr) / 2);
      const team2MMR = Math.round((player3.mmr + player4.mmr) / 2);

      console.log('Generated doubles match:', {
        team1: [player1.name, player2.name],
        team2: [player3.name, player4.name],
        playerIds: [player1.id, player2.id, player3.id, player4.id]
      });

      // Clear any previous singles match
      setRandomPlayer1(null);
      setRandomPlayer2(null);

      // Set the random teams for doubles
      setRandomTeam1({
        player1: player1,
        player2: player2,
        teamMMR: team1MMR
      });

      setRandomTeam2({
        player1: player3,
        player2: player4,
        teamMMR: team2MMR
      });
    }

    setWinnerTeam(null);
    setSelectedTeam1(null);
    setSelectedTeam2(null);

    // Random teams generated successfully
  };

  const recordMatch = async () => {
    // Handle random singles match
    if (randomPlayer1 && randomPlayer2 && winnerTeam) {
      if (winnerTeam !== 1 && winnerTeam !== 2) {
        alert('Please select a winner');
        return;
      }

      setLoading(true);
      
      try {
        const response = await fetch('/api/matches/singles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            player1: randomPlayer1,
            player2: randomPlayer2,
            winner: winnerTeam
          })
        });

        if (response.ok) {
          setWinnerTeam(null);
          onMatchRecorded();
          // Generate another random match immediately
          generateRandomMatch();
        } else {
          const error = await response.json();
          alert(`Error recording singles match: ${error.error}`);
        }
      } catch (error) {
        console.error('Error recording singles match:', error);
        alert('Error recording singles match');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Handle random doubles teams
    if (randomTeam1 && randomTeam2 && winnerTeam) {
      if (winnerTeam !== 1 && winnerTeam !== 2) {
        alert('Please select a winner');
        return;
      }

      setLoading(true);
      
      try {
        const response = await fetch('/api/matches/random', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            team1: {
              player1Id: randomTeam1.player1.id,
              player2Id: randomTeam1.player2.id,
              teamMMR: randomTeam1.teamMMR
            },
            team2: {
              player1Id: randomTeam2.player1.id,
              player2Id: randomTeam2.player2.id,
              teamMMR: randomTeam2.teamMMR
            },
            winnerTeam: winnerTeam
          })
        });

        if (response.ok) {
          setWinnerTeam(null);
          onMatchRecorded();
          // Generate another random match immediately
          generateRandomMatch();
        } else {
          const error = await response.json();
          alert(`Error recording doubles match: ${error.error}`);
        }
      } catch (error) {
        console.error('Error recording doubles match:', error);
        alert('Error recording doubles match');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Handle existing team selection logic
    if (!selectedTeam1 || !selectedTeam2 || !winnerTeam) {
      alert('Please select both teams and a winner');
      return;
    }

    if (selectedTeam1 === selectedTeam2) {
      alert('Please select two different teams');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          team1Id: selectedTeam1,
          team2Id: selectedTeam2,
          winnerTeamId: winnerTeam
        })
      });

      if (response.ok) {
        setSelectedTeam1(null);
        setSelectedTeam2(null);
        setWinnerTeam(null);
        onMatchRecorded();
      } else {
        const error = await response.json();
        alert(`Error recording match: ${error.error}`);
      }
    } catch (error) {
      console.error('Error recording match:', error);
      alert('Error recording match');
    } finally {
      setLoading(false);
    }
  };

  // Filter teams based on match type and group
  const getFilteredTeams = () => {
    // Ensure teams is always an array to avoid filter errors
    const safeTeams = Array.isArray(teams) ? teams : [];
    
    const baseTeams = selectedGroup === 'ALL' 
      ? safeTeams 
      : safeTeams.filter(team => team.group_name === selectedGroup);
    
    if (matchType === 'singles') {
      // For singles, only show teams where both players are the same (singles teams)
      return baseTeams.filter(team => team.player1_id === team.player2_id);
    } else {
      // For doubles, only show teams where players are different (doubles teams)
      return baseTeams.filter(team => team.player1_id !== team.player2_id);
    }
  };

  const filteredTeams = getFilteredTeams();

  const getTeam = (teamId: number) => {
    const safeTeams = Array.isArray(teams) ? teams : [];
    return safeTeams.find(t => t.id === teamId);
  };
  
  // Helper function to display team names based on match type
  const getTeamDisplayName = (team: TeamWithPlayers | null | undefined) => {
    if (!team) return 'Unknown Team';
    
    if (matchType === 'singles' || team.player1_id === team.player2_id) {
      // Singles match - show only one player name
      return team.player1_name || 'Unknown Player';
    } else {
      // Doubles match - show both player names
      return `${team.player1_name || 'Unknown'} & ${team.player2_name || 'Unknown'}`;
    }
  };
  const team1 = selectedTeam1 ? getTeam(selectedTeam1) : null;
  const team2 = selectedTeam2 ? getTeam(selectedTeam2) : null;

  const matchStats = team1 && team2 ? {
    competitiveness: calculateMatchCompetitiveness(team1.team_mmr, team2.team_mmr),
    team1WinProb: calculateWinProbability(team1.team_mmr, team2.team_mmr),
    mmrPreview: calculateMMRChange(
      winnerTeam === team1.id ? team1.team_mmr : team2.team_mmr,
      winnerTeam === team1.id ? team2.team_mmr : team1.team_mmr
    )
  } : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Match Recorder</h2>
        
        {/* Match Type Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Match Type</h3>
          <div className="flex space-x-2">
            {[
              { id: 'doubles', name: 'Doubles (2v2)', icon: '👥' },
              { id: 'singles', name: 'Singles (1v1)', icon: '🤺' }
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setMatchType(type.id as 'doubles' | 'singles');
                  // Clear any existing matches when switching types
                  setRandomTeam1(null);
                  setRandomTeam2(null);
                  setRandomPlayer1(null);
                  setRandomPlayer2(null);
                  setWinnerTeam(null);
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  matchType === type.id
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{type.icon}</span>
                <span>{type.name}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Group Selection */}
        <div className="flex space-x-2 mb-6">
          {[
            { id: 'A', name: 'Group A' },
            { id: 'B', name: 'Group B' },
            { id: 'ALL', name: 'All Attendees' }
          ].map((group) => {
            let presentInGroup, totalInGroup;
            
            if (group.id === 'ALL') {
              // Get attendance from localStorage for all players
              const savedAttendance = localStorage.getItem('tennis-attendance');
              let presentPlayerIds: Set<number> = new Set();
              
              if (savedAttendance) {
                try {
                  const attendanceArray = JSON.parse(savedAttendance);
                  presentPlayerIds = new Set(attendanceArray);
                } catch (error) {
                  console.error('Error loading attendance:', error);
                }
              }
              
              presentInGroup = presentPlayerIds.size;
              totalInGroup = players.length;
            } else {
              presentInGroup = presentCount[group.id as 'A' | 'B'] || 0;
              totalInGroup = players.filter(p => p.group === group.id).length;
            }
            
            return (
              <button
                key={group.id}
                onClick={() => {
                  setSelectedGroup(group.id as 'A' | 'B' | 'ALL');
                  setSelectedTeam1(null);
                  setSelectedTeam2(null);
                  setWinnerTeam(null);
                  setRandomTeam1(null);
                  setRandomTeam2(null);
                  updatePresentCount(); // Refresh attendance count
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  selectedGroup === group.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <div>{group.name}</div>
                {presentInGroup > 0 && (
                  <div className="text-xs opacity-75">
                    {presentInGroup}/{totalInGroup} present
                  </div>
                )}
              </button>
            );
          })}
        </div>

      </div>

      {/* Match Setup */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Record {matchType === 'singles' ? 'Singles' : 'Doubles'} Match (Group {selectedGroup})</h3>
          <div className="flex space-x-2">
            {((randomTeam1 && randomTeam2) || (randomPlayer1 && randomPlayer2)) && (
              <button
                onClick={() => {
                  setRandomTeam1(null);
                  setRandomTeam2(null);
                  setRandomPlayer1(null);
                  setRandomPlayer2(null);
                  setWinnerTeam(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <span>✖️</span>
                <span>Clear</span>
              </button>
            )}
            <button
              onClick={generateRandomMatch}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <span>🎲</span>
              <span>Next Match</span>
            </button>
          </div>
        </div>
        
        {/* Random Singles Display */}
        {randomPlayer1 && randomPlayer2 ? (
          <div className="mb-6">
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h4 className="font-medium text-orange-900 mb-3 text-center">
                Random Singles Match Generated
                {selectedGroup === 'ALL' && (
                  <span className="block text-sm font-normal text-orange-700 mt-1">
                    Mixed Groups Match
                  </span>
                )}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {/* Player 1 */}
                <div className="text-center p-4 bg-white rounded-lg border">
                  <h5 className="font-medium text-gray-900 mb-2">Player 1</h5>
                  <p className="text-lg font-semibold text-gray-900">
                    {randomPlayer1.name}
                    {selectedGroup === 'ALL' && (
                      <span className="text-xs text-gray-500 ml-1">(G{randomPlayer1.group})</span>
                    )}
                  </p>
                  <p className="text-lg font-semibold text-blue-600 mt-2">MMR: {randomPlayer1.mmr}</p>
                </div>
                
                {/* VS */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">VS</div>
                </div>
                
                {/* Player 2 */}
                <div className="text-center p-4 bg-white rounded-lg border">
                  <h5 className="font-medium text-gray-900 mb-2">Player 2</h5>
                  <p className="text-lg font-semibold text-gray-900">
                    {randomPlayer2.name}
                    {selectedGroup === 'ALL' && (
                      <span className="text-xs text-gray-500 ml-1">(G{randomPlayer2.group})</span>
                    )}
                  </p>
                  <p className="text-lg font-semibold text-red-600 mt-2">MMR: {randomPlayer2.mmr}</p>
                </div>
              </div>
              
              <div className="text-center mt-4">
                <p className="text-sm text-orange-700">
                  Competitiveness: {calculateMatchCompetitiveness(randomPlayer1.mmr, randomPlayer2.mmr)}/100
                  <span className="ml-2">
                    ({getCompetitivenessLabel(calculateMatchCompetitiveness(randomPlayer1.mmr, randomPlayer2.mmr))})
                  </span>
                </p>
              </div>
            </div>
          </div>
        ) : 
        
        /* Random Teams Display */
        randomTeam1 && randomTeam2 ? (
          <div className="mb-6">
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h4 className="font-medium text-purple-900 mb-3 text-center">
                Random Match Generated
                {selectedGroup === 'ALL' && (
                  <span className="block text-sm font-normal text-purple-700 mt-1">
                    Mixed Groups Match
                  </span>
                )}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {/* Team 1 */}
                <div className="text-center p-4 bg-white rounded-lg border">
                  <h5 className="font-medium text-gray-900 mb-2">Team 1</h5>
                  <p className="text-sm text-gray-700">
                    {randomTeam1.player1.name}
                    {selectedGroup === 'ALL' && (
                      <span className="text-xs text-gray-500 ml-1">(G{randomTeam1.player1.group})</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-700">
                    {randomTeam1.player2.name}
                    {selectedGroup === 'ALL' && (
                      <span className="text-xs text-gray-500 ml-1">(G{randomTeam1.player2.group})</span>
                    )}
                  </p>
                  <p className="text-lg font-semibold text-blue-600 mt-2">MMR: {randomTeam1.teamMMR}</p>
                </div>
                
                {/* VS */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">VS</div>
                </div>
                
                {/* Team 2 */}
                <div className="text-center p-4 bg-white rounded-lg border">
                  <h5 className="font-medium text-gray-900 mb-2">Team 2</h5>
                  <p className="text-sm text-gray-700">
                    {randomTeam2.player1.name}
                    {selectedGroup === 'ALL' && (
                      <span className="text-xs text-gray-500 ml-1">(G{randomTeam2.player1.group})</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-700">
                    {randomTeam2.player2.name}
                    {selectedGroup === 'ALL' && (
                      <span className="text-xs text-gray-500 ml-1">(G{randomTeam2.player2.group})</span>
                    )}
                  </p>
                  <p className="text-lg font-semibold text-red-600 mt-2">MMR: {randomTeam2.teamMMR}</p>
                </div>
              </div>
              
              <div className="text-center mt-4">
                <p className="text-sm text-purple-700">
                  Competitiveness: {calculateMatchCompetitiveness(randomTeam1.teamMMR, randomTeam2.teamMMR)}/100
                  <span className="ml-2">
                    ({getCompetitivenessLabel(calculateMatchCompetitiveness(randomTeam1.teamMMR, randomTeam2.teamMMR))})
                  </span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Team 1 Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {matchType === 'singles' ? 'Player 1' : 'Team 1'}
              </label>
              <select
                value={selectedTeam1 || ''}
                onChange={(e) => {
                  setSelectedTeam1(e.target.value ? Number(e.target.value) : null);
                  setWinnerTeam(null);
                }}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{matchType === 'singles' ? 'Select Player 1' : 'Select Team 1'}</option>
                {filteredTeams.map((team) => (
                  <option key={team.id} value={team.id} disabled={team.id === selectedTeam2}>
                    {getTeamDisplayName(team)} (MMR: {team.team_mmr})
                  </option>
                ))}
              </select>
            </div>

            {/* Team 2 Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {matchType === 'singles' ? 'Player 2' : 'Team 2'}
              </label>
              <select
                value={selectedTeam2 || ''}
                onChange={(e) => {
                  setSelectedTeam2(e.target.value ? Number(e.target.value) : null);
                  setWinnerTeam(null);
                }}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{matchType === 'singles' ? 'Select Player 2' : 'Select Team 2'}</option>
                {filteredTeams.map((team) => (
                  <option key={team.id} value={team.id} disabled={team.id === selectedTeam1}>
                    {getTeamDisplayName(team)} (MMR: {team.team_mmr})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Match Preview */}
        {team1 && team2 && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Match Preview</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <h5 className="font-medium text-gray-900">{matchType === 'singles' ? 'Player 1' : 'Team 1'}</h5>
                <p className="text-sm text-gray-900 font-medium">{getTeamDisplayName(team1)}</p>
                <p className="text-lg font-semibold text-blue-600">MMR: {team1.team_mmr}</p>
                {matchStats && (
                  <p className="text-sm text-gray-600">
                    Win Probability: {Math.round(matchStats.team1WinProb * 100)}%
                  </p>
                )}
              </div>
              
              <div className="text-center">
                <h5 className="font-medium text-gray-900">{matchType === 'singles' ? 'Player 2' : 'Team 2'}</h5>
                <p className="text-sm text-gray-900 font-medium">{getTeamDisplayName(team2)}</p>
                <p className="text-lg font-semibold text-red-600">MMR: {team2.team_mmr}</p>
                {matchStats && (
                  <p className="text-sm text-gray-600">
                    Win Probability: {Math.round((1 - matchStats.team1WinProb) * 100)}%
                  </p>
                )}
              </div>
            </div>

            {matchStats && (
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  Competitiveness: {matchStats.competitiveness}/100 
                  <span className="ml-2 text-gray-500">
                    ({getCompetitivenessLabel(matchStats.competitiveness)})
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Winner Selection for Random Singles */}
        {randomPlayer1 && randomPlayer2 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Winner</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setWinnerTeam(1)}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  winnerTeam === 1
                    ? 'border-green-500 bg-green-50 text-green-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="font-medium">{randomPlayer1.name}</div>
                <div className="text-sm opacity-75">MMR: {randomPlayer1.mmr}</div>
                {winnerTeam === 1 && (
                  <div className="text-sm mt-2 text-green-700">
                    MMR Change: +{calculateMMRChange(randomPlayer1.mmr, randomPlayer2.mmr).winnerChange}
                  </div>
                )}
              </button>
              
              <button
                onClick={() => setWinnerTeam(2)}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  winnerTeam === 2
                    ? 'border-green-500 bg-green-50 text-green-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="font-medium">{randomPlayer2.name}</div>
                <div className="text-sm opacity-75">MMR: {randomPlayer2.mmr}</div>
                {winnerTeam === 2 && (
                  <div className="text-sm mt-2 text-green-700">
                    MMR Change: +{calculateMMRChange(randomPlayer2.mmr, randomPlayer1.mmr).winnerChange}
                  </div>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Winner Selection for Random Teams */}
        {randomTeam1 && randomTeam2 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Winner</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setWinnerTeam(1)}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  winnerTeam === 1
                    ? 'border-green-500 bg-green-50 text-green-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="font-medium">{randomTeam1.player1.name} & {randomTeam1.player2.name}</div>
                <div className="text-sm opacity-75">MMR: {randomTeam1.teamMMR}</div>
                {winnerTeam === 1 && (
                  <div className="text-sm mt-2 text-green-700">
                    MMR Change: +{calculateMMRChange(randomTeam1.teamMMR, randomTeam2.teamMMR).winnerChange}
                  </div>
                )}
              </button>
              
              <button
                onClick={() => setWinnerTeam(2)}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  winnerTeam === 2
                    ? 'border-green-500 bg-green-50 text-green-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="font-medium">{randomTeam2.player1.name} & {randomTeam2.player2.name}</div>
                <div className="text-sm opacity-75">MMR: {randomTeam2.teamMMR}</div>
                {winnerTeam === 2 && (
                  <div className="text-sm mt-2 text-green-700">
                    MMR Change: +{calculateMMRChange(randomTeam2.teamMMR, randomTeam1.teamMMR).winnerChange}
                  </div>
                )}
              </button>
            </div>
            
            {winnerTeam && (
              <div className="mt-3 text-center text-sm text-gray-600">
                Loser will lose {Math.abs(calculateMMRChange(
                  winnerTeam === 1 ? randomTeam1.teamMMR : randomTeam2.teamMMR,
                  winnerTeam === 1 ? randomTeam2.teamMMR : randomTeam1.teamMMR
                ).loserChange)} MMR points
              </div>
            )}
          </div>
        )}

        {/* Winner Selection for Regular Teams */}
        {team1 && team2 && !randomTeam1 && !randomTeam2 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Winner</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setWinnerTeam(team1.id)}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  winnerTeam === team1.id
                    ? 'border-green-500 bg-green-50 text-green-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="font-medium">{getTeamDisplayName(team1)}</div>
                <div className="text-sm opacity-75">MMR: {team1.team_mmr}</div>
                {winnerTeam === team1.id && matchStats && (
                  <div className="text-sm mt-2 text-green-700">
                    MMR Change: +{matchStats.mmrPreview.winnerChange}
                  </div>
                )}
              </button>
              
              <button
                onClick={() => setWinnerTeam(team2.id)}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  winnerTeam === team2.id
                    ? 'border-green-500 bg-green-50 text-green-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="font-medium">{getTeamDisplayName(team2)}</div>
                <div className="text-sm opacity-75">MMR: {team2.team_mmr}</div>
                {winnerTeam === team2.id && matchStats && (
                  <div className="text-sm mt-2 text-green-700">
                    MMR Change: +{matchStats.mmrPreview.winnerChange}
                  </div>
                )}
              </button>
            </div>
            
            {winnerTeam && matchStats && (
              <div className="mt-3 text-center text-sm text-gray-600">
                Loser will lose {Math.abs(matchStats.mmrPreview.loserChange)} MMR points
              </div>
            )}
          </div>
        )}

        <button
          onClick={recordMatch}
          disabled={
            loading || 
            (!winnerTeam) || 
            (!(randomTeam1 && randomTeam2) && !(randomPlayer1 && randomPlayer2) && (!selectedTeam1 || !selectedTeam2))
          }
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Recording Match...' : 'Record Match'}
        </button>
      </div>
    </div>
  );
}