import { StateCreator } from 'zustand';

export interface UISlice {
    isLoading: boolean;
    error: string | null;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
    isLoading: false,
    error: null,
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
});
