import { Notification } from '../store/slices/uiSlice';

export interface AppError {
    message: string;
    originalError?: any;
    context?: string;
}

// Global reference to the store's notification function to avoid circular dependencies
let notificationFn: ((notification: Notification | null) => void) | null = null;

/**
 * Registers the notification function from the store.
 * This should be called once when the store is initialized.
 */
export const registerNotificationFn = (fn: (notification: Notification | null) => void) => {
    notificationFn = fn;
};

/**
 * Centralized error handler for the application.
 * Logs the error to console and shows a user-friendly notification.
 */
export const handleError = (err: any, context?: string) => {
    const errorMessage = err?.message || 'Si è verificato un errore imprevisto.';

    console.error(`[Error][${context || 'Global'}]:`, {
        message: errorMessage,
        original: err,
    });

    let userMessage = errorMessage;
    const status = err?.status || err?.code;

    if (status === 422 || status === '23505') {
        userMessage = 'Questo elemento (o email) è già registrato nel sistema.';
    } else if (status === 401 || status === 'PGRST301') {
        userMessage = 'Credenziali non valide o sessione scaduta.';
    } else if (status === 403) {
        userMessage = 'Non hai i permessi per eseguire questa operazione.';
    } else if (status === 404) {
        userMessage = 'Risorsa non trovata.';
    } else if (errorMessage.toLowerCase().includes('network') || status === '0') {
        userMessage = 'Errore di rete. Controlla la tua connessione e riprova.';
    } else if (errorMessage.includes('JWT') || errorMessage.includes('invalid claim')) {
        userMessage = 'Sessione non valida. Effettua nuovamente l\'accesso.';
    }

    // Use our custom notification system if registered
    if (notificationFn) {
        notificationFn({
            type: 'error',
            title: context ? `Attenzione - ${context}` : 'Attenzione',
            message: userMessage,
        });
    }

    return {
        message: userMessage,
        originalError: err,
        context,
    };
};

/**
 * Success notification helper
 */
export const showSuccess = (message: string, title: string = 'Successo') => {
    if (notificationFn) {
        notificationFn({
            type: 'success',
            title,
            message,
        });
    }
};
