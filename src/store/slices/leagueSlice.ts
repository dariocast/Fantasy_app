import { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabase';
import { League, Role, User } from '../../types';
import { UISlice } from './uiSlice';
import { AuthSlice } from './authSlice';
import { handleError, showSuccess } from '../../lib/error-handler';
import { validateLeagueData } from '../../lib/validation';

export interface LeagueSlice {
    leagues: League[];
    activeLeagueId: string | null;
    setActiveLeagueId: (id: string | null) => void;
    addLeague: (league: League) => Promise<void>;
    updateLeague: (league: League) => Promise<void>;
    deleteLeague: (leagueId: string) => Promise<void>;
    joinLeague: (leagueId: string, userId: string) => Promise<void>;
    addLeagueOrganizer: (leagueId: string, userEmail: string) => Promise<void>;
}

export const createLeagueSlice: StateCreator<LeagueSlice & UISlice & AuthSlice, [], [], LeagueSlice> = (set, get) => ({
    leagues: [],
    activeLeagueId: null,

    setActiveLeagueId: (id) => set({ activeLeagueId: id }),

    addLeague: async (league: League) => {
        // Validation
        const validation = validateLeagueData(league.name, league.settings.budget, league.settings.squadSize);
        if (!validation.isValid) {
            handleError({ message: validation.errors.join('\n') }, 'Validazione Torneo');
            return;
        }

        get().setLoading(true);
        try {
            set((state) => ({ leagues: [...state.leagues, league] }));
            const { error } = await supabase.from('leagues').insert({
                id: league.id,
                name: league.name,
                type: league.type,
                series_id: league.seriesId,
                series_name: league.seriesName,
                logo: league.logo,
                roles: league.roles,
                join_code: league.joinCode,
                settings: league.settings
            });
            if (error) throw error;
            showSuccess('Torneo creato con successo!');
        } catch (err: any) {
            handleError(err, 'Creazione Torneo');
            // Rollback local state
            set((state) => ({ leagues: state.leagues.filter(l => l.id !== league.id) }));
        } finally {
            get().setLoading(false);
        }
    },

    updateLeague: async (league: League) => {
        get().setLoading(true);
        try {
            const previousLeagues = get().leagues;
            set((state) => ({
                leagues: state.leagues.map(l => l.id === league.id ? league : l)
            }));
            const { error } = await supabase.from('leagues').update({
                name: league.name,
                type: league.type,
                series_id: league.seriesId,
                series_name: league.seriesName,
                logo: league.logo,
                roles: league.roles,
                join_code: league.joinCode,
                settings: league.settings
            }).eq('id', league.id);
            if (error) throw error;
        } catch (err: any) {
            handleError(err, 'Aggiornamento Torneo');
            // Logic for rollback would go here if needed
        } finally {
            get().setLoading(false);
        }
    },

    deleteLeague: async (leagueId: string) => {
        get().setLoading(true);
        try {
            // Optimistic update: filter out the league and its related data
            set((state) => ({
                leagues: state.leagues.filter(l => l.id !== leagueId),
                activeLeagueId: state.activeLeagueId === leagueId ? null : state.activeLeagueId
            }));
            const { error } = await supabase.from('leagues').delete().eq('id', leagueId);
            if (error) throw error;
            showSuccess('Torneo eliminato.');
        } catch (err: any) {
            handleError(err, 'Eliminazione Torneo');
        } finally {
            get().setLoading(false);
        }
    },

    joinLeague: async (leagueId: string, userId: string) => {
        get().setLoading(true);
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
                showSuccess('Ti sei unito al torneo!');
            }
        } catch (err: any) {
            handleError(err, 'Unisciti al Torneo');
        } finally {
            get().setLoading(false);
        }
    },

    addLeagueOrganizer: async (leagueId: string, userEmail: string) => {
        get().setLoading(true);
        try {
            const users = get().users;
            const user = users.find((u: User) => u.email === userEmail);
            if (!user) {
                throw new Error('Utente non trovato con questa email.');
            }
            const league = get().leagues.find((l: League) => l.id === leagueId);
            if (!league) return;

            if (league.roles[user.id] === 'admin') {
                throw new Error('Questo utente è già admin del torneo.');
            }

            const newRoles: Record<string, Role> = { ...league.roles, [user.id]: 'organizer' as Role };
            const updatedLeague: League = { ...league, roles: newRoles };

            set((state) => ({
                leagues: state.leagues.map((l: League) => l.id === leagueId ? updatedLeague : l)
            }));

            const { error } = await supabase.from('leagues').update({ roles: newRoles }).eq('id', leagueId);
            if (error) throw error;
            showSuccess(`${user.firstName} ${user.lastName} aggiunto come Co-Amministratore.`);
        } catch (err: any) {
            handleError(err, 'Aggiunta Amministratore');
        } finally {
            get().setLoading(false);
        }
    },
});
