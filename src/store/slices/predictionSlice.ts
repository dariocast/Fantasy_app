import { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabase';
import { Prediction } from '../../types';
import { AppState } from '../index';

export interface PredictionSlice {
  predictions: Prediction[];
  fetchPredictions: (tournamentId: string) => Promise<void>;
  upsertPrediction: (prediction: Partial<Prediction>) => Promise<void>;
}

export const createPredictionSlice: StateCreator<
  AppState,
  [],
  [],
  PredictionSlice
> = (set, get) => ({
  predictions: [],

  fetchPredictions: async (tournamentId: string) => {
    try {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('tournament_id', tournamentId);

      if (error) throw error;

      const formatted = (data || []).map(p => ({
        id: p.id,
        tournamentId: p.tournament_id,
        fantasyTeamId: p.fantasy_team_id,
        matchId: p.match_id,
        homeScore: p.home_score,
        awayScore: p.away_score,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));

      set({ predictions: formatted });
    } catch (error) {
      console.error('[Error][fetchPredictions]:', error);
      throw error;
    }
  },

  upsertPrediction: async (prediction: Partial<Prediction>) => {
    try {
      if (!prediction.matchId || !prediction.fantasyTeamId || !prediction.tournamentId) {
        throw new Error('Missing required fields for prediction');
      }

      // Pre-check match start time
      const match = get().matches.find(m => m.id === prediction.matchId);
      if (match && match.startTime) {
        const startTime = new Date(match.startTime).getTime();
        const now = new Date().getTime();
        if (now >= startTime) {
          throw new Error('La partita è già iniziata o terminata. Non puoi più inserire pronostici.');
        }
      }

      const payload = {
        tournament_id: prediction.tournamentId,
        fantasy_team_id: prediction.fantasyTeamId,
        match_id: prediction.matchId,
        home_score: prediction.homeScore,
        away_score: prediction.awayScore,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('predictions')
        .upsert(payload, { onConflict: 'fantasy_team_id,match_id' })
        .select()
        .single();

      if (error) throw error;

      const updated = {
        id: data.id,
        tournamentId: data.tournament_id,
        fantasyTeamId: data.fantasy_team_id,
        matchId: data.match_id,
        homeScore: data.home_score,
        awayScore: data.away_score,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      set(state => ({
        predictions: [
          ...state.predictions.filter(p => p.id !== updated.id),
          updated
        ]
      }));
    } catch (error) {
      console.error('[Error][upsertPrediction]:', error);
      throw error;
    }
  },
});
