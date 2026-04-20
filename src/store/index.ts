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
    activeLeagueId: string | null;

    // Actions
    setCurrentUser: (user: User | null) => void;
    setActiveLeagueId: (id: string | null) => void;
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
    resetStore: () => void;

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
            activeLeagueId: null,

            setCurrentUser: (user: User | null) => set({ currentUser: user }),
            setActiveLeagueId: (id: string | null) => set({ activeLeagueId: id }),
            addUser: (user: User) => set((state) => ({ users: [...state.users, user] })),

            // --- League CRUD ---
            addLeague: async (league: League) => {
                try {
                    set((state) => ({ leagues: [...state.leagues, league] }));
                    const { error } = await supabase.from('leagues').insert({
                        id: league.id,
                        name: league.name,
                        type: league.type,
                        series_id: league.seriesId,
                        series_name: league.seriesName,
                        roles: league.roles,
                        join_code: league.joinCode,
                        settings: league.settings
                    });
                    if (error) throw error;
                } catch (err: any) {
                    console.error('Error adding league:', err.message);
                }
            },
            updateLeague: async (league: League) => {
                try {
                    set((state) => ({
                        leagues: state.leagues.map(l => l.id === league.id ? league : l)
                    }));
                    const { error } = await supabase.from('leagues').update({
                        name: league.name,
                        type: league.type,
                        series_id: league.seriesId,
                        series_name: league.seriesName,
                        roles: league.roles,
                        join_code: league.joinCode,
                        settings: league.settings
                    }).eq('id', league.id);
                    if (error) throw error;
                } catch (err: any) {
                    console.error('Error updating league:', err.message);
                }
            },
            deleteLeague: async (leagueId: string) => {
                try {
                    set((state) => ({
                        leagues: state.leagues.filter(l => l.id !== leagueId),
                        realTeams: state.realTeams.filter(t => t.leagueId !== leagueId),
                        players: state.players.filter(p => p.leagueId !== leagueId),
                        matches: state.matches.filter(m => m.leagueId !== leagueId),
                        fantasyTeams: state.fantasyTeams.filter(ft => ft.leagueId !== leagueId),
                    }));
                    const { error } = await supabase.from('leagues').delete().eq('id', leagueId);
                    if (error) throw error;
                } catch (err: any) {
                    console.error('Error deleting league:', err.message);
                }
            },
            addLeagueOrganizer: async (leagueId: string, userEmail: string) => {
                try {
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

                    const { error } = await supabase.from('leagues').update({ roles: newRoles }).eq('id', leagueId);
                    if (error) throw error;
                    alert(`${user.firstName} ${user.lastName} aggiunto come Co-Amministratore.`);
                } catch (err: any) {
                    console.error('Error adding organizer:', err.message);
                }
            },

            updateUser: async (user: User) => {
                try {
                    set((state) => ({
                        currentUser: user,
                        users: state.users.map((u: User) => u.id === user.id ? user : u)
                    }));
                    const { error } = await supabase.from('profiles').update({
                        first_name: user.firstName,
                        last_name: user.lastName,
                        hidden_leagues: user.hiddenLeagues
                    }).eq('id', user.id);
                    if (error) throw error;
                } catch (err: any) {
                    console.error('Error updating user profile:', err.message);
                }
            },
            joinLeague: async (leagueId: string, userId: string) => {
                try {
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
                        const { error } = await supabase.from('leagues').update({ roles: league.roles }).eq('id', leagueId);
                        if (error) throw error;
                    }
                } catch (err: any) {
                    console.error('Error joining league:', err.message);
                }
            },

            // --- Team CRUD ---
            deleteTeam: async (teamId: string) => {
                try {
                    set((state) => ({
                        realTeams: state.realTeams.filter(t => t.id !== teamId),
                        players: state.players.filter(p => p.realTeamId !== teamId),
                        matches: state.matches.map(m => ({
                            ...m,
                            events: m.events.filter(e => e.teamId !== teamId)
                        }))
                    }));
                    const { error } = await supabase.from('real_teams').delete().eq('id', teamId);
                    if (error) throw error;
                } catch (err: any) {
                    console.error('Error deleting team:', err.message);
                }
            },
            updateTeam: async (team: RealTeam) => {
                try {
                    set((state) => ({
                        realTeams: state.realTeams.find(t => t.id === team.id)
                            ? state.realTeams.map(t => t.id === team.id ? team : t)
                            : [...state.realTeams, team]
                    }));
                    const { error } = await supabase.from('real_teams').upsert({
                        id: team.id,
                        league_id: team.leagueId,
                        name: team.name,
                        logo: team.logo,
                        group_id: team.groupId
                    });
                    if (error) throw error;
                } catch (err: any) {
                    console.error('Error updating team:', err.message);
                }
            },

            // --- Player CRUD ---
            deletePlayer: async (playerId: string) => {
                try {
                    set((state) => ({
                        players: state.players.filter(p => p.id !== playerId),
                        matches: state.matches.map(m => ({
                            ...m,
                            events: m.events.filter(e => e.playerId !== playerId)
                        }))
                    }));
                    const { error } = await supabase.from('players').delete().eq('id', playerId);
                    if (error) throw error;
                } catch (err: any) {
                    console.error('Error deleting player:', err.message);
                }
            },
            updatePlayer: async (player: Player) => {
                try {
                    set((state) => ({
                        players: state.players.find(p => p.id === player.id)
                            ? state.players.map(p => p.id === player.id ? player : p)
                            : [...state.players, player]
                    }));
                    const { error } = await supabase.from('players').upsert({
                        id: player.id,
                        league_id: player.leagueId,
                        real_team_id: player.realTeamId,
                        name: player.name,
                        position: player.position,
                        real_position: player.realPosition,
                        age: player.age,
                        price: player.price,
                        photo: player.photo,
                        career_id: player.careerId
                    });
                    if (error) throw error;
                } catch (err: any) {
                    console.error('Error updating player:', err.message);
                }
            },

            // --- Match CRUD ---
            deleteMatch: async (matchId: string) => {
                try {
                    set((state) => ({
                        matches: state.matches.filter(m => m.id !== matchId)
                    }));
                    const { error } = await supabase.from('matches').delete().eq('id', matchId);
                    if (error) throw error;
                } catch (err: any) {
                    console.error('Error deleting match:', err.message);
                }
            },
            updateMatch: async (match: Match) => {
                try {
                    set((state) => ({
                        matches: state.matches.find(m => m.id === match.id)
                            ? state.matches.map(m => m.id === match.id ? match : m)
                            : [...state.matches, match]
                    }));
                    const { error } = await supabase.from('matches').upsert({
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
                        scheduled_time: match.scheduledTime,
                        match_type: match.matchType,
                        stage: match.stage,
                        home_penalties: match.homePenalties,
                        away_penalties: match.awayPenalties
                    });
                    if (error) throw error;
                } catch (err: any) {
                    console.error('Error updating match:', err.message);
                }
            },

            // --- Fantasy Team Actions ---
            updateFantasyTeam: async (ft: FantasyTeam) => {
                try {
                    set(state => ({
                        fantasyTeams: state.fantasyTeams.find(t => t.id === ft.id)
                            ? state.fantasyTeams.map(t => t.id === ft.id ? ft : t)
                            : [...state.fantasyTeams, ft]
                    }));
                    const { error } = await supabase.from('fantasy_teams').upsert({
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
                    if (error) throw error;
                } catch (err: any) {
                    console.error('Error updating fantasy team:', err.message);
                }
            },

            updateFantasyLineup: async (fl: FantasyLineup) => {
                try {
                    set(state => ({
                        fantasyLineups: state.fantasyLineups.find(l => l.id === fl.id)
                            ? state.fantasyLineups.map(l => l.id === fl.id ? fl : l)
                            : [...state.fantasyLineups, fl]
                    }));
                    const { error } = await supabase.from('fantasy_lineups').upsert({
                        id: fl.id,
                        fantasy_team_id: fl.fantasyTeamId,
                        matchday: fl.matchday,
                        starters: fl.starters,
                        bench: fl.bench,
                        points: fl.points,
                        player_points: fl.playerPoints
                    });
                    if (error) throw error;
                } catch (err: any) {
                    console.error('Error updating fantasy lineup:', err.message);
                }
            },

            // --- PlayerBonus CRUD ---
            addPlayerBonus: async (bonus: PlayerBonus) => {
                try {
                    set((state) => ({
                        playerBonuses: state.playerBonuses.find((b: PlayerBonus) => b.id === bonus.id)
                            ? state.playerBonuses.map((b: PlayerBonus) => b.id === bonus.id ? bonus : b)
                            : [...state.playerBonuses, bonus]
                    }));
                    const { error } = await supabase.from('player_bonuses').upsert({
                        id: bonus.id,
                        league_id: bonus.leagueId,
                        player_id: bonus.playerId,
                        description: bonus.description,
                        value: bonus.value,
                        type: bonus.type
                    });
                    if (error) throw error;
                } catch (err: any) {
                    console.error('Error adding player bonus:', err.message);
                }
            },
            deletePlayerBonus: async (bonusId: string) => {
                try {
                    set((state) => ({ playerBonuses: state.playerBonuses.filter((b: PlayerBonus) => b.id !== bonusId) }));
                    const { error } = await supabase.from('player_bonuses').delete().eq('id', bonusId);
                    if (error) throw error;
                } catch (err: any) {
                    console.error('Error deleting player bonus:', err.message);
                }
            },

            resetStore: () => {
                set({
                    currentUser: null,
                    leagues: [],
                    realTeams: [],
                    players: [],
                    matches: [],
                    fantasyTeams: [],
                    fantasyLineups: [],
                    playerBonuses: [],
                    activeLeagueId: null
                });
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
                    events: Array.isArray(m.events) ? m.events : [],
                    playerVotes: (m.player_votes && typeof m.player_votes === 'object') ? m.player_votes : {},
                    status: m.status,
                    isFantasyMatchday: m.is_fantasy_matchday,
                    scheduledDate: m.scheduled_date,
                    scheduledTime: m.scheduled_time,
                    matchType: m.match_type,
                    stage: m.stage,
                    homePenalties: m.home_penalties,
                    awayPenalties: m.away_penalties
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
                    leagues: (leagues || []).map((l: any) => ({
                        ...l,
                        seriesId: l.series_id,
                        seriesName: l.series_name,
                        joinCode: l.join_code
                    })),
                    realTeams: (realTeams || []).map((rt: any) => ({
                        ...rt,
                        leagueId: rt.league_id,
                        groupId: rt.group_id
                    })),
                    players: (players || []).map((p: any) => ({ ...p, leagueId: p.league_id, realTeamId: p.real_team_id, realPosition: p.real_position, careerId: p.career_id })),
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
                    playerBonuses: (playerBonuses || []).map((pb: any) => ({ ...pb, leagueId: pb.league_id, playerId: pb.player_id, type: pb.type }))
                });
                console.log('✅ Sync complete');
            },
        }),
        {
            name: 'fantalega-storage',
            storage: createJSONStorage(() => AsyncStorage),
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
