/**
 * Environment configuration and validation.
 */

export const ENV = {
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    
    // Feature flags or other settings
    IS_DEV: __DEV__,
    
    /**
     * Runtime validation to ensure critical variables are present.
     */
    isValid: () => {
        const missing = [];
        if (!ENV.SUPABASE_URL) missing.push('SUPABASE_URL');
        if (!ENV.SUPABASE_KEY) missing.push('SUPABASE_KEY');
        
        if (missing.length > 0) {
            console.error('[Config] Missing environment variables:', missing.join(', '));
            return false;
        }
        return true;
    }
};

// Auto-validate on import in dev mode
if (__DEV__ && !ENV.isValid()) {
    // We don't throw here to avoid preventing app startup entirely in some environments,
    // but the error will be in the console.
}
