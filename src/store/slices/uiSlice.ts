import { StateCreator } from 'zustand';

export interface NotificationAction {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

export interface Notification {
    type: 'success' | 'error' | 'info' | 'confirm';
    title: string;
    message: string;
    actions?: NotificationAction[];
}

export interface UISlice {
    isLoading: boolean;
    notification: Notification | null;
    setLoading: (loading: boolean) => void;
    showNotification: (notification: Notification | null) => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
    isLoading: false,
    notification: null,
    setLoading: (loading) => set({ isLoading: loading }),
    showNotification: (notification) => set({ notification }),
});
