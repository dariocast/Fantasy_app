import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import slices
import { UISlice, createUISlice } from './slices/uiSlice';
import { AuthSlice, createAuthSlice } from './slices/authSlice';
import { LeagueSlice, createLeagueSlice } from './slices/leagueSlice';
import { AdminSlice, createAdminSlice } from './slices/adminSlice';
import { FantasySlice, createFantasySlice } from './slices/fantasySlice';
import { SyncSlice, createSyncSlice } from './slices/syncSlice';

// Combine all slice types into a single interface
export type AppState = UISlice & AuthSlice & LeagueSlice & AdminSlice & FantasySlice & SyncSlice;

export const useStore = create<AppState>()(
    persist(
        (...a) => ({
            ...createUISlice(...a),
            ...createAuthSlice(...a),
            ...createLeagueSlice(...a),
            ...createAdminSlice(...a),
            ...createFantasySlice(...a),
            ...createSyncSlice(...a),
        }),
        {
            name: 'fantalega-storage',
            storage: createJSONStorage(() => AsyncStorage),
            // Keep the migration logic for data consistency
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
