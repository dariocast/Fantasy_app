import { Alert } from 'react-native';

export interface AppError {
    message: string;
    originalError?: any;
    context?: string;
}

/**
 * Centalized error handler for the application.
 * Logs the error to console and shows a user-friendly alert.
 */
export const handleError = (err: any, context?: string) => {
    const errorMessage = err?.message || 'Si è verificato un errore imprevisto.';
    
    console.error(`[Error][${context || 'Global'}]:`, {
        message: errorMessage,
        original: err,
    });

    // Provide specific user-friendly messages for common Supabase/Network errors
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

    Alert.alert(
        context ? `Attenzione - ${context}` : 'Attenzione',
        userMessage,
        [{ text: 'OK' }]
    );

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
    Alert.alert(title, message, [{ text: 'Ottimo' }]);
};
