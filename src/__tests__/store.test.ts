import { renderHook, act } from '@testing-library/react-native';
import { useStore } from '../store';

/**
 * Basic integration test for the Zustand store.
 * Verifies that the store is correctly initialized and actions work.
 */
describe('Global Store', () => {
    it('should initialize with no active league', () => {
        const { result } = renderHook(() => useStore());
        expect(result.current.activeLeagueId).toBeNull();
    });

    it('should update loading state', () => {
        const { result } = renderHook(() => useStore());
        
        act(() => {
            result.current.setLoading(true);
        });
        
        expect(result.current.isLoading).toBe(true);
    });

    it('should handle auth state', () => {
        const { result } = renderHook(() => useStore());
        const mockUser = { id: 'test-user', email: 'test@example.com' };
        
        act(() => {
            result.current.setCurrentUser(mockUser as any);
        });
        
        expect(result.current.currentUser?.id).toBe('test-user');
    });
});
