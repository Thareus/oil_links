import React, { createContext, useContext, useReducer, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { apiClient } from '../lib/api';

// Types for API responses
interface AuthResponse {
  access: string;
  refresh: string;
  user?: User;
  [key: string]: unknown; // Allow for additional properties with type safety
}

interface UserResponse {
  user: User;
  [key: string]: unknown; // Allow for additional properties with type safety
}

// Types
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  is_staff?: boolean;
}

interface AuthState {
  user: User | null;
  status: string;
  error: string | null;
  isAuthenticated: boolean;
}

type AuthAction =
  | { type: 'SET_LOADING' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User } }
  | { type: 'LOGOUT' }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

// AuthAction is now properly typed with the action types

interface AuthContextType extends Omit<AuthState, 'status'> {
  isLoading: boolean;
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<{ success: boolean; data?: AuthResponse; error?: string }>;
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; data?: AuthResponse; error?: string }>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string>;
  getCurrentUser: () => Promise<User>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Authentication states
const AUTH_STATES = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
} as const;

// Action type constants for easier reference
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_USER: 'SET_USER',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
} as const;

// Initial state
const initialState: AuthState = {
  user: null,
  status: AUTH_STATES.LOADING,
  error: null,
  isAuthenticated: false,
};

// Reducer for authentication state management
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        status: AUTH_STATES.LOADING,
        error: null,
      };
    
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        status: AUTH_STATES.AUTHENTICATED,
        isAuthenticated: true,
        error: null,
      };
    
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        status: AUTH_STATES.UNAUTHENTICATED,
        isAuthenticated: false,
        error: null,
      };
    
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        status: AUTH_STATES.AUTHENTICATED,
        isAuthenticated: true,
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        status: AUTH_STATES.UNAUTHENTICATED,
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    
    default:
      return state;
  }
}

// ============================================================================
// AUTHENTICATION PROVIDER
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Token management utilities
  const setTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  };

  const clearTokens = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  };

  const getStoredTokens = () => {
    if (typeof window === 'undefined') return { access: null, refresh: null };
    return {
      access: localStorage.getItem('access_token'),
      refresh: localStorage.getItem('refresh_token'),
    };
  };

  // Authentication actions wrapped in useCallback to prevent unnecessary re-renders
  const register = useCallback(async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<{ success: boolean; data?: AuthResponse; error?: string }> => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING });
      
      const response = await apiClient.register(userData) as AuthResponse;
      
      if (!response.access || !response.refresh) {
        throw new Error('Invalid response from server: Missing tokens');
      }
      
      setTokens(response.access, response.refresh);
      
      // Fetch user data
      const userResponse = await apiClient.getCurrentUser() as UserResponse | User;
      const user = 'user' in userResponse ? userResponse.user : userResponse;
      
      if (!user) {
        throw new Error('Failed to fetch user data after registration');
      }
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user },
      });
      
      return { success: true, data: response };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  const login = useCallback(async (credentials: { email: string; password: string }): Promise<{ success: boolean; data?: AuthResponse; error?: string }> => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING });
      
      const response = await apiClient.login(credentials) as AuthResponse;
      
      if (response?.access && response?.refresh) {
        setTokens(response.access, response.refresh);
        
        // Fetch user data if not included in login response
        const userData = response.user || (await apiClient.getCurrentUser() as User);
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: userData },
        });
      }
      
      return { success: true, data: response };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      const { refresh } = getStoredTokens();
      if (refresh) {
        // Pass the refresh token as a string, not an object
        await apiClient.logout(refresh);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearTokens();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string> => {
    try {
      const { refresh } = getStoredTokens();
      
      if (!refresh) {
        throw new Error('No refresh token available');
      }
      
      const response = await apiClient.refreshToken(refresh) as { access: string; refresh?: string };
      
      if (response.access) {
        // Use the new refresh token if provided, otherwise keep the existing one
        const nextRefresh = response.refresh || refresh;
        setTokens(response.access, nextRefresh);
        return response.access;
      }
      
      throw new Error('Token refresh failed');
    } catch (error: unknown) {
      // If refresh fails, log out the user
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Token refresh failed:', errorMessage);
      logout();
      throw error;
    }
  }, [logout]);

  const getCurrentUser = useCallback(async (): Promise<User> => {
    try {
      const response = await apiClient.getCurrentUser() as User;
      dispatch({ type: AUTH_ACTIONS.SET_USER, payload: response });
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  // Initialize authentication state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      const { access } = getStoredTokens();
      
      if (access) {
        try {
          // Verify the token is still valid
          const user = await getCurrentUser();
          dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user } });
        } catch (error) {
          // If token is invalid, clear it
          console.error('Failed to initialize auth:', error);
          clearTokens();
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
        }
      }
    };
    
    initializeAuth();
  }, [getCurrentUser]);

  // Context value with memoization to prevent unnecessary re-renders
  const contextValue: AuthContextType = useMemo(() => ({
    // State
    user: state.user,
    error: state.error,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.status === AUTH_STATES.LOADING,
    
    // Actions
    register,
    login,
    logout,
    refreshAccessToken,
    getCurrentUser,
    clearError,
  }), [state, register, login, logout, refreshAccessToken, getCurrentUser, clearError]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
