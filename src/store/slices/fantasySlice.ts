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
    deleteFantasyLineup: (lineupId: string) => Promise<void>;
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
                player_points: fl.playerPoints || {},
                player_points_details: fl.playerPointsDetails || {}
            });
            if (error) throw error;
            showSuccess('Formazione salvata!');
        } catch (err: any) {
            handleError(err, 'Salvataggio Formazione');
        } finally {
            get().setLoading(false);
        }
    },

    deleteFantasyLineup: async (lineupId: string) => {
        get().setLoading(true);
        try {
            const lineup = get().fantasyLineups.find(l => l.id === lineupId);
            if (lineup) {
                const team = get().fantasyTeams.find(t => t.id === lineup.fantasyTeamId);
                if (team) {
                    const newMatchdayPoints = { ...(team.matchdayPoints || {}) };
                    delete newMatchdayPoints[lineup.matchday];
                    const newTotal = Object.values(newMatchdayPoints).reduce((a: number, b: any) => a + (Number(b) || 0), 0) + (team.manualPointsAdjustment || 0);
                    
                    // Optimistically update team locally
                    set(state => ({
                        fantasyTeams: state.fantasyTeams.map(t => t.id === team.id ? { ...team, totalPoints: newTotal, matchdayPoints: newMatchdayPoints } : t)
                    }));
                    
                    // Update team in DB
                    await supabase.from('fantasy_teams').update({
                        total_points: newTotal,
                        matchday_points: newMatchdayPoints
                    }).eq('id', team.id);
                }
            }

            const { error } = await supabase.from('fantasy_lineups').delete().eq('id', lineupId);
            if (error) throw error;
            
            set(state => ({
                fantasyLineups: state.fantasyLineups.filter(l => l.id !== lineupId)
            }));
            showSuccess('Formazione rimossa e punteggi aggiornati!');
        } catch (err: any) {
            handleError(err, 'Rimozione Formazione');
        } finally {
            get().setLoading(false);
        }
    }
});
