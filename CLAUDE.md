# Tennis Tinder - Project Documentation

## Project Overview
**Tennis Tinder** is a mobile-first web application for managing doubles tennis matches with an ELO-based MMR (Match Making Rating) system. The app provides admin functionality for attendance tracking, random match generation, and comprehensive match recording with automatic rating updates.

## Tech Stack
- **Frontend**: Next.js 15.5.2 with TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (App Router)
- **Database**: PostgreSQL (Railway hosted)
- **Deployment**: Local development with `npm run dev`

## Database Configuration
```
Host: switchyard.proxy.rlwy.net:16205
Database: tennis-matchmaking
User: postgres
SSL: Required with rejectUnauthorized: false
```

## Key Features Implemented

### 1. **Player Management**
- 24 players divided into Group A (12) and Group B (12)
- Individual MMR tracking starting at 1200
- Win/loss statistics and match history
- Imported from CSV data format: `A,B` columns with player names

### 2. **Match Types**
- **Doubles (2v2)**: Traditional team matches with 4 players
- **Singles (1v1)**: Individual player matches
- Dynamic UI that adapts labels and display based on match type
- Smart team filtering: singles shows individual players, doubles shows paired teams

### 3. **Attendance System**
- Real-time attendance checker with localStorage persistence
- Group-specific bulk actions (Select All Group A/B, Clear Group)
- Present player statistics with live counts
- Integration with random match generation (only present players)

### 4. **Random Match Generation**
- Fisher-Yates shuffle algorithm ensures no duplicate players
- Three group options: Group A, Group B, All Attendees (mixed groups)
- Group indicators shown when mixing players from different groups
- Competitiveness scoring based on MMR differences
- Automatic next match generation after recording results

### 5. **MMR System**
- ELO-based rating system with K-factor of 32
- Starting MMR: 1200 for all players
- Dynamic MMR changes based on opponent strength
- Win probability calculations
- Team MMR calculated as average of individual player MMRs

## Database Schema

### Players Table
```sql
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  group_name TEXT CHECK(group_name IN ('A', 'B')) NOT NULL,
  mmr INTEGER NOT NULL DEFAULT 1200,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  matches_played INTEGER NOT NULL DEFAULT 0
);
```

### Teams Table
```sql
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  player1_id INTEGER NOT NULL REFERENCES players(id),
  player2_id INTEGER NOT NULL REFERENCES players(id),
  team_mmr INTEGER NOT NULL,
  active_status BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(player1_id, player2_id)
);
```

### Matches Table
```sql
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  team1_id INTEGER NOT NULL REFERENCES teams(id),
  team2_id INTEGER NOT NULL REFERENCES teams(id),
  winner_team_id INTEGER REFERENCES teams(id),
  mmr_change INTEGER NOT NULL DEFAULT 0,
  date TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## API Endpoints

### Core Routes
- `GET /api/players` - Fetch all players
- `GET /api/teams` - Fetch all active teams
- `GET /api/matches` - Fetch all matches with player details
- `GET /api/teams-with-players` - Fetch teams with joined player names

### Match Recording
- `POST /api/matches/random` - Record doubles match results
- `POST /api/matches/singles` - Record singles match results
- `POST /api/teams` - Create new teams

## Component Architecture

### Main Components
- **`page.tsx`** - Main dashboard with tab navigation
- **`MatchRecorder.tsx`** - Core match management (random generation, recording)
- **`AttendanceChecker.tsx`** - Attendance tracking with localStorage
- **`PlayerList.tsx`** - Player management and statistics
- **`Leaderboard.tsx`** - Rankings and MMR display
- **`MatchHistory.tsx`** - Historical match data

### Key Features in MatchRecorder
- Match type selector (Doubles/Singles with icons)
- Group selection (A, B, All Attendees)
- Random match generation with duplicate prevention
- Team/player selection dropdowns with smart filtering
- Winner selection with MMR change preview
- Automatic continuous match generation

## Data Flow

### Match Recording Process
1. **Attendance Check** - Load present players from localStorage
2. **Random Generation** - Fisher-Yates shuffle of available players
3. **Team Creation** - Create temporary database teams
4. **Match Recording** - Store match results
5. **MMR Updates** - Update individual player stats and team MMRs
6. **Auto-Generate** - Immediately create next random match

### Singles vs Doubles Logic
- **Singles**: Teams where `player1_id === player2_id` (same player twice)
- **Doubles**: Teams where `player1_id !== player2_id` (different players)
- **UI Adaptation**: Labels change from "Team 1/2" to "Player 1/2" for singles
- **Display Logic**: Shows single name vs "Name1 & Name2" based on match type

## Migration History

### Database Migration (SQLite → PostgreSQL)
- Successfully migrated from better-sqlite3 to pg
- Updated all database methods to async/await
- Proper connection pooling with Railway PostgreSQL
- Data migration script imported 24 players from CSV
- Created both singles teams (24) and doubles teams (8) for testing

## UI/UX Improvements

### Responsive Design
- Mobile-first approach with Tailwind CSS
- Tab-based navigation for different functions
- Card-based layout for statistics and actions
- Color-coded team/group indicators

### Visual Enhancements
- Match type icons (👥 for doubles, 🤺 for singles)
- Group indicators (GA/GB) for mixed matches
- MMR change previews with win probabilities
- Competitiveness scoring (0-100 scale)
- Dark, readable text for player names (text-gray-900)

## Error Handling & Robustness
- Defensive programming with null/undefined checks
- Safe array filtering with `Array.isArray()` validation
- Graceful fallbacks for missing data
- Comprehensive validation for match recording
- Connection timeout handling for database operations

## Current Database State
- **Players**: 24 (12 Group A, 12 Group B)
- **Singles Teams**: 24 (one per player)
- **Doubles Teams**: 8 (4 Group A, 4 Group B)
- **Matches**: 0 (ready for match recording)

## Development Commands
```bash
npm run dev        # Start development server
npm install        # Install dependencies
node scripts/migrate-to-postgres.js    # Run database migration
node scripts/check-database.js         # Verify database contents
```

## File Structure
```
src/
├── app/
│   ├── api/
│   │   ├── players/route.ts
│   │   ├── teams/route.ts
│   │   ├── matches/
│   │   │   ├── route.ts
│   │   │   ├── random/route.ts
│   │   │   └── singles/route.ts
│   │   └── teams-with-players/route.ts
│   ├── page.tsx
│   └── layout.tsx
├── components/
│   ├── MatchRecorder.tsx      # Core match functionality
│   ├── AttendanceChecker.tsx  # Attendance tracking
│   ├── PlayerList.tsx         # Player management
│   ├── Leaderboard.tsx        # Rankings display
│   └── MatchHistory.tsx       # Match history
└── lib/
    ├── database.ts            # PostgreSQL database class
    └── mmr.ts                 # ELO rating calculations
```

## Key Algorithms

### Fisher-Yates Shuffle (Match Generation)
```typescript
for (let i = 0; i < requiredPlayers && shuffleablePlayers.length > 0; i++) {
  const randomIndex = Math.floor(Math.random() * shuffleablePlayers.length);
  const selectedPlayer = shuffleablePlayers.splice(randomIndex, 1)[0];
  selectedPlayers.push(selectedPlayer);
}
```

### ELO MMR Calculation
```typescript
const expectedWinner = 1 / (1 + Math.pow(10, (loserMmr - winnerMmr) / 400));
const winnerChange = Math.round(kFactor * (1 - expectedWinner));
const loserChange = Math.round(kFactor * (0 - (1 - expectedWinner)));
```

## Future Enhancements Consideration
- Player statistics dashboard
- Match scheduling system
- Tournament bracket generation
- Advanced analytics and reporting
- Mobile app conversion
- Real-time match updates
- Player profile management

## Recent Development Changes (Session: 2025-09-11)

### **Major Database Architecture Refactor**
**Issue Resolved**: Eliminated "duplicate key value violates unique constraint" error that was preventing match recording.

**Solution**: Migrated from team-based to player-based match recording system.

#### **Database Schema Changes**

1. **New Matches Table Structure**:
   ```sql
   CREATE TABLE matches (
     id SERIAL PRIMARY KEY,
     match_type VARCHAR(10) CHECK(match_type IN ('singles', 'doubles')) NOT NULL,
     
     -- Team 1 players
     team1_player1_id INTEGER NOT NULL REFERENCES players(id),
     team1_player2_id INTEGER REFERENCES players(id), -- NULL for singles
     
     -- Team 2 players  
     team2_player1_id INTEGER NOT NULL REFERENCES players(id),
     team2_player2_id INTEGER REFERENCES players(id), -- NULL for singles
     
     -- Match result
     winner_team INTEGER CHECK(winner_team IN (1, 2)) NOT NULL,
     mmr_change INTEGER NOT NULL DEFAULT 0,
     date TIMESTAMP NOT NULL DEFAULT NOW(),
     
     -- Built-in constraints prevent duplicate players
     CHECK (team1_player1_id != team2_player1_id),
     CHECK (team1_player1_id != team2_player2_id),
     CHECK (team1_player2_id != team2_player1_id OR team1_player2_id IS NULL),
     CHECK (team1_player2_id != team2_player2_id OR team1_player2_id IS NULL),
     CHECK (team1_player1_id != team1_player2_id OR team1_player2_id IS NULL),
     CHECK (team2_player1_id != team2_player2_id OR team2_player2_id IS NULL)
   );
   ```

2. **Teams Table Modification**:
   ```sql
   ALTER TABLE teams ALTER COLUMN player2_id DROP NOT NULL;
   ```
   - Allows NULL values for `player2_id` to support singles teams

#### **Backend API Changes**

1. **Updated Database Methods**:
   - `createMatch()`: Now accepts players directly instead of team IDs
   - `getAllMatches()`: Uses LEFT JOINs to handle NULL player2_id values
   - `createTeam()`: Optional `player2Id` parameter for singles support

2. **Match Recording Logic**:
   - **Singles**: Records with `team1_player2_id = NULL` and `team2_player2_id = NULL`
   - **Doubles**: Records all 4 player IDs
   - **Validation**: Built-in database constraints prevent duplicate players
   - **MMR Calculation**: Works directly from player MMRs

#### **Frontend UI Refactor**

1. **MatchRecorder Component Overhaul**:
   - **Old**: Team selection dropdowns with pre-created teams
   - **New**: Individual player selection for each position
   
2. **New State Management**:
   ```typescript
   // Old team-based state (removed)
   const [selectedTeam1, setSelectedTeam1] = useState<number | null>(null);
   const [selectedTeam2, setSelectedTeam2] = useState<number | null>(null);
   
   // New player-based state
   const [team1Player1, setTeam1Player1] = useState<Player | null>(null);
   const [team1Player2, setTeam1Player2] = useState<Player | null>(null);
   const [team2Player1, setTeam2Player1] = useState<Player | null>(null);
   const [team2Player2, setTeam2Player2] = useState<Player | null>(null);
   ```

3. **Enhanced UI Features**:
   - **Smart Player Filtering**: Prevents selecting the same player multiple times
   - **Dynamic Layout**: Shows/hides Player 2 dropdowns based on match type (singles vs doubles)
   - **Group Filtering**: Respects selected group (A, B, All) for player options
   - **Improved Text Visibility**: Fixed white-on-white text issue in dropdowns
   - **Real-time Validation**: Immediate feedback for invalid player combinations

4. **Match Preview & Winner Selection**:
   - **Dynamic Display**: Shows player names based on match type
   - **Team MMR Calculation**: Calculated on-the-fly from selected players
   - **Winner Buttons**: Use team numbers (1, 2) instead of database IDs

#### **Key Benefits Achieved**

1. **Eliminated Constraint Errors**: No more duplicate key violations when recording matches
2. **Simplified Architecture**: Direct player-to-match relationship removes team complexity
3. **Better UX**: Intuitive player selection instead of confusing team dropdowns  
4. **Improved Performance**: Fewer database operations (no team creation/management)
5. **Enhanced Validation**: Built-in database constraints ensure data integrity
6. **Singles Match Fix**: Proper handling prevents double-counting wins/losses

#### **Backwards Compatibility**

- **Random Match Generation**: Still works seamlessly with new system
- **Match History**: Displays correctly with LEFT JOINs handling NULL values
- **Player Statistics**: Unchanged, continues to track individual performance
- **MMR Calculations**: Same ELO algorithm, just different data source

#### **Testing Results**

- ✅ **Singles Matches**: Record properly with single players per team
- ✅ **Doubles Matches**: Record properly with player pairs
- ✅ **Validation**: Database constraints prevent invalid player combinations  
- ✅ **Match History**: Displays both singles and doubles matches correctly
- ✅ **Performance**: No duplicate key errors, smooth match recording
- ✅ **UI Responsiveness**: Fast player selection with real-time filtering

**Migration Status**: ✅ **COMPLETE** - Production ready with full backwards compatibility