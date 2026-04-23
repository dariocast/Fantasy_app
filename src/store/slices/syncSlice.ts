import { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabase';
import { Match, FantasyTeam } from '../../types';
import { UISlice } from './uiSlice';
import { AuthSlice } from './authSlice';
import { LeagueSlice } from './leagueSlice';
import { AdminSlice } from './adminSlice';
import { FantasySlice } from './fantasySlice';
import { PredictionSlice } from './predictionSlice';
import { handleError } from '../../lib/error-handler';

export interface SyncSlice {
    syncAllData: () => Promise<void>;
    resetStore: () => void;
}

export const createSyncSlice: StateCreator<
    SyncSlice & UISlice & AuthSlice & LeagueSlice & AdminSlice & FantasySlice & PredictionSlice,
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
            notification: null,
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
                { data: playerBonuses },
                { data: predictions }
            ] = await Promise.all([
                supabase.from('leagues').select('*'),
                supabase.from('real_teams').select('*'),
                supabase.from('players').select('*'),
                supabase.from('matches').select('*'),
                supabase.from('fantasy_teams').select('*'),
                supabase.from('fantasy_lineups').select('*'),
                supabase.from('player_bonuses').select('*'),
                supabase.from('predictions').select('*')
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
                startTime: m.start_time || (m.scheduled_date && m.scheduled_time ? `${m.scheduled_date}T${m.scheduled_time}:00` : undefined),
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
                    playerPoints: fl.player_points || {},
                    playerPointsDetails: fl.player_points_details || {}
                })),
                playerBonuses: (playerBonuses || []).map((pb: any) => ({ 
                    ...pb, 
                    leagueId: pb.league_id, 
                    playerId: pb.player_id, 
                    matchId: pb.match_id,
                    matchday: pb.matchday,
                    type: pb.type 
                })),
                predictions: (predictions || []).map((p: any) => ({
                    id: p.id,
                    tournamentId: p.tournament_id,
                    fantasyTeamId: p.fantasy_team_id,
                    matchId: p.match_id,
                    homeScore: p.home_score,
                    awayScore: p.away_score,
                    createdAt: p.created_at,
                    updatedAt: p.updated_at
                }))
            });
            console.log('✅ Sync complete');
        } catch (err: any) {
            handleError(err, 'Sincronizzazione Dati');
        } finally {
            get().setLoading(false);
        }
    },
});
