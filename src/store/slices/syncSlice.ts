import { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabase';
import { Match, FantasyTeam } from '../../types';
import { UISlice } from './uiSlice';
import { AuthSlice } from './authSlice';
import { LeagueSlice } from './leagueSlice';
import { AdminSlice } from './adminSlice';
import { FantasySlice } from './fantasySlice';
import { handleError } from '../../lib/error-handler';

export interface SyncSlice {
    syncAllData: () => Promise<void>;
    resetStore: () => void;
}

export const createSyncSlice: StateCreator<
    SyncSlice & UISlice & AuthSlice & LeagueSlice & AdminSlice & FantasySlice,
    [],
    [],
    SyncSlice
> = (set, get) => ({
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
            activeLeagueId: null,
            error: null,
        });
    },

    syncAllData: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            get().setLoading(true);
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
        } catch (err: any) {
            handleError(err, 'Sincronizzazione Dati');
        } finally {
            get().setLoading(false);
        }
    },
});
