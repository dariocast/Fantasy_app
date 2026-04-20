/**
 * Centralized validation logic for the application.
 */

export const isValidEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

export const isNonEmptyString = (str: string | undefined | null): boolean => {
    return typeof str === 'string' && str.trim().length > 0;
};

export const isValidAge = (age: number): boolean => {
    return age >= 16 && age <= 50;
};

export const isPositiveNumber = (num: number): boolean => {
    return typeof num === 'number' && !isNaN(num) && num >= 0;
};

/**
 * Validates league settings
 */
export interface LeagueValidationResult {
    isValid: boolean;
    errors: string[];
}

export const validateLeagueData = (name: string, budget: number, squadSize: number): LeagueValidationResult => {
    const errors: string[] = [];
    
    if (!isNonEmptyString(name)) errors.push('Il nome del torneo è richiesto.');
    if (budget < 0) errors.push('Il budget non può essere negativo.');
    if (squadSize < 11) errors.push('La dimensione della rosa deve essere almeno di 11 giocatori.');

    return {
        isValid: errors.length === 0,
        errors,
    };
};
