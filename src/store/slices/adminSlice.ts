import { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabase';
import { RealTeam, Player, Match, PlayerBonus } from '../../types';
import { UISlice } from './uiSlice';
import { handleError, showSuccess } from '../../lib/error-handler';
import { isPositiveNumber, isValidAge } from '../../lib/validation';

export interface AdminSlice {
    realTeams: RealTeam[];
    players: Player[];
    matches: Match[];
    playerBonuses: PlayerBonus[];
    deleteTeam: (teamId: string) => Promise<void>;
    updateTeam: (team: RealTeam) => Promise<void>;
    deletePlayer: (playerId: string) => Promise<void>;
    updatePlayer: (player: Player) => Promise<void>;
    deleteMatch: (matchId: string) => Promise<void>;
    updateMatch: (match: Match) => Promise<void>;
    addPlayerBonus: (bonus: PlayerBonus) => Promise<void>;
    deletePlayerBonus: (bonusId: string) => Promise<void>;
}

export const createAdminSlice: StateCreator<AdminSlice & UISlice, [], [], AdminSlice> = (set, get) => ({
    realTeams: [],
    players: [],
    matches: [],
    playerBonuses: [],

    // --- Team CRUD ---
    deleteTeam: async (teamId: string) => {
        get().setLoading(true);
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
            handleError(err, 'Eliminazione Squadra');
        } finally {
            get().setLoading(false);
        }
    },
    updateTeam: async (team: RealTeam) => {
        get().setLoading(true);
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
            showSuccess('Squadra salvata!');
        } catch (err: any) {
            handleError(err, 'Aggiornamento Squadra');
        } finally {
            get().setLoading(false);
        }
    },

    // --- Player CRUD ---
    deletePlayer: async (playerId: string) => {
        get().setLoading(true);
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
            handleError(err, 'Eliminazione Giocatore');
        } finally {
            get().setLoading(false);
        }
    },
    updatePlayer: async (player: Player) => {
        // Validation
        if (!isValidAge(player.age)) {
            handleError({ message: 'L\'età deve essere compresa tra 16 e 50 anni.' }, 'Validazione Giocatore');
            return;
        }
        if (player.price !== undefined && !isPositiveNumber(player.price)) {
            handleError({ message: 'La quotazione non può essere negativa.' }, 'Validazione Giocatore');
            return;
        }

        get().setLoading(true);
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
            showSuccess('Giocatore salvato!');
        } catch (err: any) {
            handleError(err, 'Aggiornamento Giocatore');
        } finally {
            get().setLoading(false);
        }
    },

    // --- Match CRUD ---
    deleteMatch: async (matchId: string) => {
        get().setLoading(true);
        try {
            set((state) => ({
                matches: state.matches.filter(m => m.id !== matchId)
            }));
            const { error } = await supabase.from('matches').delete().eq('id', matchId);
            if (error) throw error;
        } catch (err: any) {
            handleError(err, 'Eliminazione Match');
        } finally {
            get().setLoading(false);
        }
    },
    updateMatch: async (match: Match) => {
        get().setLoading(true);
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
            showSuccess('Partita salvata!');
        } catch (err: any) {
            handleError(err, 'Aggiornamento Match');
        } finally {
            get().setLoading(false);
        }
    },

    // --- PlayerBonus CRUD ---
    addPlayerBonus: async (bonus: PlayerBonus) => {
        get().setLoading(true);
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
                match_id: bonus.matchId,
                matchday: bonus.matchday,
                description: bonus.description,
                value: bonus.value,
                type: bonus.type
            });
            if (error) throw error;
        } catch (err: any) {
            handleError(err, 'Salvataggio Bonus');
        } finally {
            get().setLoading(false);
        }
    },
    deletePlayerBonus: async (bonusId: string) => {
        get().setLoading(true);
        try {
            set((state) => ({ playerBonuses: state.playerBonuses.filter((b: PlayerBonus) => b.id !== bonusId) }));
            const { error } = await supabase.from('player_bonuses').delete().eq('id', bonusId);
            if (error) throw error;
        } catch (err: any) {
            handleError(err, 'Eliminazione Bonus');
        } finally {
            get().setLoading(false);
        }
    },
});
