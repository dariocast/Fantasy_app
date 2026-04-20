import { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabase';
import { FantasyTeam, FantasyLineup } from '../../types';
import { UISlice } from './uiSlice';
import { handleError, showSuccess } from '../../lib/error-handler';

export interface FantasySlice {
    fantasyTeams: FantasyTeam[];
    fantasyLineups: FantasyLineup[];
    updateFantasyTeam: (ft: FantasyTeam) => Promise<void>;
    updateFantasyLineup: (fl: FantasyLineup) => Promise<void>;
}

export const createFantasySlice: StateCreator<FantasySlice & UISlice, [], [], FantasySlice> = (set, get) => ({
    fantasyTeams: [],
    fantasyLineups: [],

    updateFantasyTeam: async (ft: FantasyTeam) => {
        get().setLoading(true);
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
                players: ft.players || [],
                manual_points_adjustment: ft.manualPointsAdjustment || 0,
                matchday_points: ft.matchdayPoints || {},
                total_points: ft.totalPoints || 0
            });
            if (error) throw error;
        } catch (err: any) {
            handleError(err, 'Aggiornamento Team Fantasy');
        } finally {
            get().setLoading(false);
        }
    },

    updateFantasyLineup: async (fl: FantasyLineup) => {
        get().setLoading(true);
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
                starters: fl.starters || {},
                bench: fl.bench || [],
                points: fl.points || 0,
                player_points: fl.playerPoints || {}
            });
            if (error) throw error;
            showSuccess('Formazione salvata!');
        } catch (err: any) {
            handleError(err, 'Salvataggio Formazione');
        } finally {
            get().setLoading(false);
        }
    },
});
