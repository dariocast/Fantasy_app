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
    
    if (errorMessage.includes('network')) {
        userMessage = 'Errore di rete. Controlla la tua connessione e riprova.';
    } else if (errorMessage.includes('JWT')) {
        userMessage = 'Sessione scaduta. Effettua nuovamente l\'accesso.';
    } else if (errorMessage.includes('duplicate')) {
        userMessage = 'Questo elemento esiste già.';
    }

    Alert.alert(
        context ? `Errore - ${context}` : 'Errore',
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
