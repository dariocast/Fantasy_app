export type Role = 'admin' | 'organizer' | 'user';
export type TournamentType = 'campionato' | 'gironi' | 'gironi_eliminazione' | 'eliminazione';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  // Password omitted from user object in real app, stored securely. For mock we keep it simple.
  password?: string;
  resetCode?: string;
  hiddenLeagues?: string[];
}

export interface LeagueSettings {
  budget: number;
  squadSize: number;
  startersCount: number;
  benchCount: number;
  useBaseVote: boolean;
  baseVoteType: 'manual' | 'automatic';
  scoreBonusEnabled: boolean;
  scoreBonusRule?: string;
  hasFantasy: boolean;

  // NEW: Setup Strutturato del Torneo Reale
  sportType?: 'c5' | 'c7' | 'c8' | 'c11';
  groupCount?: number;
  groupAdvancingTeams?: number;
  groupNames?: string[];
  playoffTeamsCount?: number;
  playoffStartingStage?: string;
  playoutEnabled?: boolean;
  playoutTeamsCount?: number;
  playoffCalendarType?: 'automatic' | 'manual';
  tournamentStages?: string[];
  groupPenaltiesEnabled?: boolean;
  groupPenaltiesWinPoints?: number;
  groupPenaltiesLossPoints?: number;

  // NEW: Regole Fantasy Aggiuntive
  maxSubstitutions?: number;
  rosterType?: 'fixed' | 'variable';
  useCustomRoles?: boolean;
  customRoles?: { name: string; minLimit: number; maxLimit: number; color?: string }[];
  matchdayDeadlines: Record<number, string>;
  fantasyMarketDeadline?: string;
  autoVoteBands?: { id: string; minDiff: number; maxDiff: number; points: number }[];
  
  // Rule: Max players from the same real team
  maxPlayersPerRealTeamEnabled?: boolean;
  maxPlayersPerRealTeam?: number;

  // Custom Default Bonus
  customBonus: {
    goal: number;
    assist: number;
    yellowCard: number;
    redCard: number;
    ownGoal: number;
    mvp: number;
    cleanSheet: number;
  };

  // Predictions settings
  predictionsEnabled?: boolean;
  predictionPointsOutcome?: number; // Es. +2 per 1X2
  predictionPointsExact?: number;   // Es. +5 per risultato esatto

  // NEW: Bonus specifici per categoria (es. Goal -> Amuleto: 10, Star: 3)
  // Mappa: bonusType (goal, assist, etc) -> categoryName -> value
  categoryBonuses?: Record<string, Record<string, number>>;

  // NEW: Definizioni Bonus Custom Strutturati
  customBonusDefinitions?: { id: string; name: string; value: number; target: 'player' | 'team' | 'both' }[];

  // NEW: Assegnazioni Bonus alle Squadre (per matchday)
  teamBonusAssignments?: { id: string; teamId: string; definitionId: string; matchday: number }[];

  // Extra Bonuses mapped by matchday
  extraBonuses: Record<number, { id: string; name: string; value: number }[]>;

  // NEW: Criteri di spareggio classifica (in ordine di priorità)
  tiebreakerOrder?: ('head_to_head' | 'goal_difference' | 'goals_for' | 'goals_against' | 'wins' | 'fairplay')[];
}

export interface League {
  id: string;
  name: string;
  type: TournamentType;
  roles: Record<string, Role>; // userId -> role
  settings: LeagueSettings;
  joinCode: string;
  seriesId?: string; // NEW: To link multiple editions of the same tournament (e.g. "Champions 2025" and "Champions 2026")
  seriesName?: string;
  logo?: string;
}

export interface RealTeam {
  id: string;
  name: string;
  logo: string;
  leagueId: string;
  groupId?: string; // For group stages
}

export interface Player {
  id: string;
  name: string;
  position: string; // Fantasy Position / Category
  realPosition?: string; // NEW: Real Football Position (e.g. "Terzino", "Centrocampista", "Pivot")
  age: number;
  price?: number; // Quotazione for Fantasy Leagues
  photo?: string; // NEW URL or Base64 string for the player's photo
  realTeamId: string;
  leagueId: string;
  careerId?: string; // NEW: Global identifier linking this player across multiple edtions to aggregate stats
}

export interface MatchEvent {
  id: string;
  playerId: string;
  type: 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'own_goal' | 'mvp' | 'foul' | 'extra' | 'clean_sheet';
  teamId: string; // which team the player belongs to
  extraBonusId?: string; // se type === 'extra'
}

export type MatchStatus = 'scheduled' | 'in_progress' | 'finished';

export interface Match {
  id: string;
  leagueId: string;
  matchday: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  playerVotes: Record<string, number>; // playerId -> voto base assegnato (se manuale)
  status: MatchStatus; // replaces old `played` boolean
  played?: boolean; // DEPRECATED — kept for migration only
  scheduledDate?: string; // ISO date e.g. "2026-04-15"
  scheduledTime?: string; // 24h time e.g. "20:30"
  startTime?: string; // NEW: ISO combined date/time
  isFantasyMatchday: boolean; // if valid for fantasy points
  matchType?: 'campionato' | 'gironi' | 'eliminazione' | 'playout';
  stage?: string; // e.g. 'Ottavi', 'Girone A', etc.
  phaseNumber?: number; // 1: Playout, 2: Quarti, 3: Semis, 4: Final, etc.
  homePenalties?: number;
  awayPenalties?: number;
}

export interface FantasyTeam {
  id: string;
  userId: string;
  leagueId: string;
  name: string;
  budgetRemaining: number;
  players: string[]; // array of playerIds
  manualPointsAdjustment: number; // added by admin
  matchdayPoints?: Record<number, number>; // matchday -> points
  totalPoints?: number; // accumulated total
}

export interface FantasyLineup {
  id: string; // usually composite like `${fantasyTeamId}_${matchday}`
  fantasyTeamId: string;
  matchday: number;
  starters: Record<string, string>; // position on field (e.g., '1', '2', etc.) -> playerId
  bench: string[]; // ordered array of playerIds
  points?: number; // Total points for this lineup at this matchday
  playerPoints?: Record<string, number>; // playerId -> points scored by this specific starter
  playerPointsDetails?: Record<string, {
    baseVote: number;
    events: { type: string; value: number }[];
    manualBonuses: { description: string; value: number }[];
    total: number;
  }>;
}

// NEW: Bonus assegnati ai singoli giocatori (campo o extra campo)
export interface Prediction {
  id: string;
  tournamentId: string;
  fantasyTeamId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerBonus {
  id: string;
  playerId: string;
  leagueId: string;
  matchId?: string; // Tying to a specific match
  matchday?: number; // Or a specific matchday
  value: number;
  description: string;
  type: 'field' | 'extra'; // campo o extra-campo
}


