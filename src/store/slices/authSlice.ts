import { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';
import { UISlice } from './uiSlice';
import { handleError } from '../../lib/error-handler';

export interface AuthSlice {
    currentUser: User | null;
    users: User[];
    setCurrentUser: (user: User | null) => void;
    addUser: (user: User) => void;
    updateUser: (user: User) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (params: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
    deleteAccount: () => Promise<void>;
}

export const createAuthSlice: StateCreator<AuthSlice & UISlice, [], [], AuthSlice> = (set, get) => ({
    currentUser: null,
    users: [],

    setCurrentUser: (user) => set({ currentUser: user }),
    addUser: (user) => set((state) => ({ users: [...state.users, user] })),

    signIn: async (email, password) => {
        get().setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password
            });
            if (error) throw error;

            let { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profileError || !profile) {
                // Auto-create profile for legacy accounts or if trigger failed
                const { data: newProfile, error: insertError } = await supabase
                    .from('profiles')
                    .insert([{
                        id: data.user.id,
                        first_name: data.user.user_metadata?.first_name || '',
                        last_name: data.user.user_metadata?.last_name || '',
                        hidden_leagues: []
                    }])
                    .select()
                    .single();

                if (insertError) {
                    console.error('ERRORE DETTAGLIATO SUPABASE:', insertError);

                    // Ultimo tentativo: riprova a caricarlo (magari è stato creato nel frattempo o l'errore era un duplicato)
                    const { data: retryProfile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', data.user.id)
                        .single();

                    if (!retryProfile) {
                        throw new Error(`Errore database: ${insertError.message}`);
                    }
                    profile = retryProfile;
                } else {
                    profile = newProfile;
                }
            }

            const user = {
                id: data.user.id,
                email: data.user.email || email,
                firstName: profile.first_name || '',
                lastName: profile.last_name || '',
                hidden_leagues: profile.hidden_leagues || [],
            };
            set({ currentUser: user });
        } catch (err: any) {
            handleError(err, 'Accesso');
            throw err;
        } finally {
            get().setLoading(false);
        }
    },

    signUp: async ({ email, password, firstName, lastName }) => {
        get().setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: { data: { first_name: firstName, last_name: lastName } }
            });
            if (error) throw error;

            if (data.user) {
                const user = {
                    id: data.user.id,
                    email: data.user.email || email,
                    firstName,
                    lastName,
                };
                set((state) => ({
                    users: [...state.users, user],
                    currentUser: user
                }));
            }
        } catch (err: any) {
            handleError(err, 'Registrazione');
            throw err;
        } finally {
            get().setLoading(false);
        }
    },

    updateUser: async (user: User) => {
        get().setLoading(true);
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
            handleError(err, 'Aggiornamento profilo');
        } finally {
            get().setLoading(false);
        }
    },

    deleteAccount: async () => {
        get().setLoading(true);
        try {
            const user = get().currentUser;
            if (!user) throw new Error('Nessun utente autenticato');

            // 1. Prova a chiamare l'RPC per eliminare l'utente da auth.users
            const { error: rpcError } = await supabase.rpc('delete_user');

            // 2. Se l'RPC fallisce (magari non è stata ancora creata su Supabase),
            // eliminiamo almeno il record del profilo e scolleghiamo l'utente
            if (rpcError) {
                console.warn('RPC delete_user failed or not found, falling back to profile deletion:', rpcError);
                await supabase.from('profiles').delete().eq('id', user.id);
            }

            // 3. Logout locale
            await supabase.auth.signOut();
            set({ currentUser: null });

            // Note: DashboardDrawer already handles navigating to Auth screen
            // and resetting the rest of the store.
        } catch (err: any) {
            handleError(err, 'Eliminazione Account');
            throw err;
        } finally {
            get().setLoading(false);
        }
    },
});
