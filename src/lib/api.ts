import { supabase } from './supabase';
import { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';

export type ApiResult<T> = {
    data: T | null;
    error: {
        message: string;
        status?: number;
        code?: string;
    } | null;
};

/**
 * Type-safe API layer for Supabase operations.
 * Centralizes error handling and response formatting.
 */
export const api = {
    /**
     * Executes a Supabase query and returns a standardized ApiResult.
     */
    async request<T>(
        queryPromise: Promise<PostgrestResponse<T> | PostgrestSingleResponse<T>>
    ): Promise<ApiResult<T>> {
        try {
            const { data, error, status } = await queryPromise;

            if (error) {
                return {
                    data: null,
                    error: {
                        message: error.message,
                        status,
                        code: error.code,
                    },
                };
            }

            return {
                data: data as T,
                error: null,
            };
        } catch (err: any) {
            return {
                data: null,
                error: {
                    message: err.message || 'Errore di connessione imprevisto',
                    status: 500,
                },
            };
        }
    },

    // Add more specific methods here as the app grows
};
