import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, League, Role, RealTeam, Player, Match, FantasyTeam, FantasyLineup } from '../types';

interface AppState {
    currentUser: User | null;
    users: User[];
    leagues: League[];
    realTeams: RealTeam[];
    players: Player[];
    matches: Match[];
    fantasyTeams: FantasyTeam[];
    fantasyLineups: FantasyLineup[];

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
}

export const useStore = create<AppState>()(
    persist(
        (set) => ({
            currentUser: null,
            users: [],
            leagues: [],
            realTeams: [],
            players: [],
            matches: [],
            fantasyTeams: [],
            fantasyLineups: [],

            setCurrentUser: (user) => set({ currentUser: user }),
            addUser: (user) => set((state) => ({ users: [...state.users, user] })),
            updateUser: (updatedUser) => set((state) => ({
                users: state.users.map(u => u.id === updatedUser.id ? updatedUser : u),
                currentUser: state.currentUser?.id === updatedUser.id ? updatedUser : state.currentUser
            })),

            // --- League CRUD ---
            addLeague: (league) => set((state) => ({ leagues: [...state.leagues, league] })),
            updateLeague: (league) => set((state) => ({
                leagues: state.leagues.map(l => l.id === league.id ? league : l)
            })),
            deleteLeague: (leagueId) => set((state) => ({
                leagues: state.leagues.filter(l => l.id !== leagueId),
                realTeams: state.realTeams.filter(t => t.leagueId !== leagueId),
                players: state.players.filter(p => p.leagueId !== leagueId),
                matches: state.matches.filter(m => m.leagueId !== leagueId),
                fantasyTeams: state.fantasyTeams.filter(ft => ft.leagueId !== leagueId),
                fantasyLineups: state.fantasyLineups.filter(fl => {
                    const ftIds = state.fantasyTeams.filter(ft => ft.leagueId === leagueId).map(ft => ft.id);
                    return !ftIds.includes(fl.fantasyTeamId);
                }),
            })),
            addLeagueOrganizer: (leagueId, userEmail) => set((state) => {
                const user = state.users.find(u => u.email === userEmail);
                if (!user) {
                    alert('Utente non trovato con questa email.');
                    return state;
                }
                const league = state.leagues.find(l => l.id === leagueId);
                if (!league) return state;

                // Non sovrascrivere se è già admin
                if (league.roles[user.id] === 'admin') {
                    alert('Questo utente è già admin del torneo.');
                    return state;
                }

                const newRoles: Record<string, Role> = { ...league.roles, [user.id]: 'organizer' as Role };
                const updatedLeague: League = { ...league, roles: newRoles };

                alert(`${user.firstName} ${user.lastName} aggiunto come Co-Amministratore.`);
                return {
                    leagues: state.leagues.map(l => l.id === leagueId ? updatedLeague : l)
                };
            }),
            joinLeague: (leagueId, userId) => set((state) => ({
                leagues: state.leagues.map(l => {
                    if (l.id === leagueId) {
                        return { ...l, roles: { ...l.roles, [userId]: 'user' as const } };
                    }
                    return l;
                })
            })),

            // --- Team CRUD ---
            deleteTeam: (teamId) => set((state) => ({
                realTeams: state.realTeams.filter(t => t.id !== teamId),
                players: state.players.filter(p => p.realTeamId !== teamId),
                // Remove events referencing deleted team's players
                matches: state.matches.map(m => ({
                    ...m,
                    events: m.events.filter(e => e.teamId !== teamId)
                }))
            })),
            updateTeam: (team) => set((state) => ({
                realTeams: state.realTeams.map(t => t.id === team.id ? team : t)
            })),

            // --- Player CRUD ---
            deletePlayer: (playerId) => set((state) => ({
                players: state.players.filter(p => p.id !== playerId),
                matches: state.matches.map(m => ({
                    ...m,
                    events: m.events.filter(e => e.playerId !== playerId)
                }))
            })),
            updatePlayer: (player) => set((state) => ({
                players: state.players.map(p => p.id === player.id ? player : p)
            })),

            // --- Match CRUD ---
            deleteMatch: (matchId) => set((state) => ({
                matches: state.matches.filter(m => m.id !== matchId)
            })),
            updateMatch: (match) => set((state) => ({
                matches: state.matches.map(m => m.id === match.id ? match : m)
            })),
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
