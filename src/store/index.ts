import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import type { User, League, Role, RealTeam, Player, Match, FantasyTeam, FantasyLineup, PlayerBonus } from '../types';

interface AppState {
    currentUser: User | null;
    users: User[];
    leagues: League[];
    realTeams: RealTeam[];
    players: Player[];
    matches: Match[];
    fantasyTeams: FantasyTeam[];
    fantasyLineups: FantasyLineup[];
    playerBonuses: PlayerBonus[];

    // Actions
    setCurrentUser: (user: User | null) => void;
    addUser: (user: User) => void;
    updateUser: (user: User) => void;
    addLeague: (league: League) => void;
    updateLeague: (league: League) => void;
    deleteLeague: (leagueId: string) => void;
    joinLeague: (leagueId: string, userId: string) => void;
    deleteTeam: (teamId: string) => void;
    updateTeam: (team: RealTeam) => void;
    deletePlayer: (playerId: string) => void;
    updatePlayer: (player: Player) => void;
    deleteMatch: (matchId: string) => void;
    updateMatch: (match: Match) => void;
    addLeagueOrganizer: (leagueId: string, userEmail: string) => void;
    addPlayerBonus: (bonus: PlayerBonus) => void;
    deletePlayerBonus: (bonusId: string) => void;
    updateFantasyTeam: (ft: FantasyTeam) => Promise<void>;
    updateFantasyLineup: (fl: FantasyLineup) => Promise<void>;

    // Sync
    syncAllData: () => Promise<void>;
}

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            currentUser: null,
            users: [],
            leagues: [],
            realTeams: [],
            players: [],
            matches: [],
            fantasyTeams: [],
            fantasyLineups: [],
            playerBonuses: [],

            setCurrentUser: (user) => set({ currentUser: user }),
            addUser: (user) => set((state) => ({ users: [...state.users, user] })),

            // --- League CRUD ---
            addLeague: async (league) => {
                set((state) => ({ leagues: [...state.leagues, league] }));
                await supabase.from('leagues').insert({
                    id: league.id,
                    name: league.name,
                    type: league.type,
                    series_id: league.seriesId,
                    series_name: league.seriesName,
                    roles: league.roles,
                    join_code: league.joinCode,
                    settings: league.settings
                });
            },
            updateLeague: async (league) => {
                set((state) => ({
                    leagues: state.leagues.map(l => l.id === league.id ? league : l)
                }));
                await supabase.from('leagues').update({
                    name: league.name,
                    type: league.type,
                    series_id: league.seriesId,
                    series_name: league.seriesName,
                    roles: league.roles,
                    join_code: league.joinCode,
                    settings: league.settings
                }).eq('id', league.id);
            },
            deleteLeague: async (leagueId) => {
                set((state) => ({
                    leagues: state.leagues.filter(l => l.id !== leagueId),
                    realTeams: state.realTeams.filter(t => t.leagueId !== leagueId),
                    players: state.players.filter(p => p.leagueId !== leagueId),
                    matches: state.matches.filter(m => m.leagueId !== leagueId),
                    fantasyTeams: state.fantasyTeams.filter(ft => ft.leagueId !== leagueId),
                }));
                // Cascading delete should be handled by DB foreign keys, 
                // but we call delete on leagues table.
                await supabase.from('leagues').delete().eq('id', leagueId);
            },
            addLeagueOrganizer: async (leagueId: string, userEmail: string) => {
                const state = get();
                const user = state.users.find((u: User) => u.email === userEmail);
                if (!user) {
                    alert('Utente non trovato con questa email.');
                    return;
                }
                const league = state.leagues.find((l: League) => l.id === leagueId);
                if (!league) return;

                if (league.roles[user.id] === 'admin') {
                    alert('Questo utente è già admin del torneo.');
                    return;
                }

                const newRoles: Record<string, Role> = { ...league.roles, [user.id]: 'organizer' as Role };
                const updatedLeague: League = { ...league, roles: newRoles };

                set({
                    leagues: state.leagues.map((l: League) => l.id === leagueId ? updatedLeague : l)
                });
                
                await supabase.from('leagues').update({ roles: newRoles }).eq('id', leagueId);
                alert(`${user.firstName} ${user.lastName} aggiunto come Co-Amministratore.`);
            },

            updateUser: async (user: User) => {
                set((state) => ({
                    currentUser: user,
                    users: state.users.map((u: User) => u.id === user.id ? user : u)
                }));
                await supabase.from('profiles').update({
                    first_name: user.firstName,
                    last_name: user.lastName,
                    hidden_leagues: user.hiddenLeagues
                }).eq('id', user.id);
            },
            joinLeague: async (leagueId: string, userId: string) => {
                set((state) => ({
                    leagues: state.leagues.map((l: League) => {
                        if (l.id === leagueId) {
                            return { ...l, roles: { ...l.roles, [userId]: 'user' as const } };
                        }
                        return l;
                    })
                }));
                const league = get().leagues.find((l: League) => l.id === leagueId);
                if (league) {
                    await supabase.from('leagues').update({ roles: league.roles }).eq('id', leagueId);
                }
            },

            // --- Team CRUD ---
            deleteTeam: async (teamId) => {
                set((state) => ({
                    realTeams: state.realTeams.filter(t => t.id !== teamId),
                    players: state.players.filter(p => p.realTeamId !== teamId),
                    matches: state.matches.map(m => ({
                        ...m,
                        events: m.events.filter(e => e.teamId !== teamId)
                    }))
                }));
                await supabase.from('real_teams').delete().eq('id', teamId);
            },
            updateTeam: async (team) => {
                set((state) => ({
                    realTeams: state.realTeams.map(t => t.id === team.id ? team : t)
                }));
                await supabase.from('real_teams').upsert({
                    id: team.id,
                    league_id: team.leagueId,
                    name: team.name,
                    logo: team.logo,
                    group_id: team.groupId
                });
            },

            // --- Player CRUD ---
            deletePlayer: async (playerId) => {
                set((state) => ({
                    players: state.players.filter(p => p.id !== playerId),
                    matches: state.matches.map(m => ({
                        ...m,
                        events: m.events.filter(e => e.playerId !== playerId)
                    }))
                }));
                await supabase.from('players').delete().eq('id', playerId);
            },
            updatePlayer: async (player) => {
                set((state) => ({
                    players: state.players.map(p => p.id === player.id ? player : p)
                }));
                await supabase.from('players').upsert({
                    id: player.id,
                    league_id: player.leagueId,
                    real_team_id: player.realTeamId,
                    name: player.name,
                    position: player.position,
                    real_position: player.realPosition,
                    age: player.age,
                    price: player.price,
                    photo: player.photo
                });
            },

            // --- Match CRUD ---
            deleteMatch: async (matchId) => {
                set((state) => ({
                    matches: state.matches.filter(m => m.id !== matchId)
                }));
                await supabase.from('matches').delete().eq('id', matchId);
            },
            updateMatch: async (match) => {
                set((state) => ({
                    matches: state.matches.map(m => m.id === match.id ? match : m)
                }));
                await supabase.from('matches').upsert({
                    id: match.id,
                    league_id: match.leagueId,
                    matchday: match.matchday,
                    home_team_id: match.homeTeamId,
                    away_team_id: match.awayTeamId,
                    home_score: match.homeScore,
                    away_score: match.awayScore,
                    events: match.events,
                    player_votes: match.playerVotes,
                    status: match.status,
                    is_fantasy_matchday: match.isFantasyMatchday,
                    scheduled_date: match.scheduledDate,
                    scheduled_time: match.scheduledTime
                });
            },

            // --- Fantasy Team Actions ---
            updateFantasyTeam: async (ft: FantasyTeam) => {
                set(state => ({
                    fantasyTeams: state.fantasyTeams.map(t => t.id === ft.id ? ft : t)
                }));
                await supabase.from('fantasy_teams').upsert({
                    id: ft.id,
                    user_id: ft.userId,
                    league_id: ft.leagueId,
                    name: ft.name,
                    budget_remaining: ft.budgetRemaining,
                    players: ft.players,
                    manual_points_adjustment: ft.manualPointsAdjustment,
                    matchday_points: ft.matchdayPoints,
                    total_points: ft.totalPoints
                });
            },

            updateFantasyLineup: async (fl: FantasyLineup) => {
                set(state => ({
                    fantasyLineups: state.fantasyLineups.map(l => l.id === fl.id ? fl : l)
                }));
                await supabase.from('fantasy_lineups').upsert({
                    id: fl.id,
                    fantasy_team_id: fl.fantasyTeamId,
                    matchday: fl.matchday,
                    starters: fl.starters,
                    bench: fl.bench,
                    points: fl.points,
                    player_points: fl.playerPoints
                });
            },

            // --- PlayerBonus CRUD ---
            addPlayerBonus: async (bonus: PlayerBonus) => {
                set((state) => ({ playerBonuses: [...state.playerBonuses, bonus] }));
                await supabase.from('player_bonuses').upsert({
                    id: bonus.id,
                    league_id: bonus.leagueId,
                    player_id: bonus.playerId,
                    description: bonus.description,
                    value: bonus.value
                });
            },
            deletePlayerBonus: async (bonusId: string) => {
                set((state) => ({ playerBonuses: state.playerBonuses.filter((b: PlayerBonus) => b.id !== bonusId) }));
                await supabase.from('player_bonuses').delete().eq('id', bonusId);
            },

            // --- SYNC LOGIC ---
            syncAllData: async () => {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                console.log('🔄 Syncing data from Supabase...');
                
                const [
                    { data: leagues },
                    { data: realTeams },
                    { data: players },
                    { data: matches },
                    { data: fantasyTeams },
                    { data: fantasyLineups },
                    { data: playerBonuses }
                ] = await Promise.all([
                    supabase.from('leagues').select('*'),
                    supabase.from('real_teams').select('*'),
                    supabase.from('players').select('*'),
                    supabase.from('matches').select('*'),
                    supabase.from('fantasy_teams').select('*'),
                    supabase.from('fantasy_lineups').select('*'),
                    supabase.from('player_bonuses').select('*')
                ]);

                // Map snake_case from DB to camelCase for App
                const mapMatch = (m: any): Match => ({
                    id: m.id,
                    leagueId: m.league_id,
                    matchday: m.matchday,
                    homeTeamId: m.home_team_id,
                    awayTeamId: m.away_team_id,
                    homeScore: m.home_score,
                    awayScore: m.away_score,
                    events: m.events || [],
                    playerVotes: m.player_votes || {},
                    status: m.status,
                    isFantasyMatchday: m.is_fantasy_matchday,
                    scheduledDate: m.scheduled_date,
                    scheduledTime: m.scheduled_time
                });

                const mapFantasyTeam = (ft: any): FantasyTeam => ({
                    id: ft.id,
                    userId: ft.user_id,
                    leagueId: ft.league_id,
                    name: ft.name,
                    budgetRemaining: ft.budget_remaining,
                    players: ft.players || [],
                    manualPointsAdjustment: ft.manual_points_adjustment || 0,
                    matchdayPoints: ft.matchday_points || {},
                    totalPoints: ft.total_points || 0
                });

                set({
                    leagues: (leagues || []).map((l: any) => ({ ...l, id: l.id })),
                    realTeams: (realTeams || []).map((rt: any) => ({ ...rt, leagueId: rt.league_id })),
                    players: (players || []).map((p: any) => ({ ...p, leagueId: p.league_id, realTeamId: p.real_team_id, realPosition: p.real_position })),
                    matches: (matches || []).map(mapMatch),
                    fantasyTeams: (fantasyTeams || []).map(mapFantasyTeam),
                    fantasyLineups: (fantasyLineups || []).map((fl: any) => ({
                        id: fl.id,
                        fantasyTeamId: fl.fantasy_team_id,
                        matchday: fl.matchday,
                        starters: fl.starters || {},
                        bench: fl.bench || [],
                        points: fl.points || 0,
                        playerPoints: fl.player_points || {}
                    })),
                    playerBonuses: (playerBonuses || []).map((pb: any) => ({ ...pb, leagueId: pb.league_id, playerId: pb.player_id }))
                });
                console.log('✅ Sync complete');
            },
        }),
        {
            name: 'fantalega-storage',
            storage: createJSONStorage(() => AsyncStorage),
            // Migration: ensure all entities have required fields
            migrate: (persistedState: any, _version: number) => {
                if (persistedState && Array.isArray(persistedState.matches)) {
                    persistedState.matches = persistedState.matches.map((m: any) => ({
                        ...m,
                        status: m.status || (m.played ? 'finished' : 'scheduled'),
                        events: Array.isArray(m.events) ? m.events : [],
                        playerVotes: m.playerVotes && typeof m.playerVotes === 'object' ? m.playerVotes : {},
                        matchType: m.matchType || 'campionato',
                        isFantasyMatchday: m.isFantasyMatchday ?? false,
                    }));
                }
                if (persistedState && Array.isArray(persistedState.players)) {
                    persistedState.players = persistedState.players.map((p: any) => ({
                        ...p,
                        price: p.price ?? 1,
                        age: p.age ?? 25,
                        realPosition: p.realPosition || 'Sconosciuto',
                        careerId: p.careerId || p.id,
                    }));
                }
                return persistedState;
            },
            version: 2,
        }
    )
);
