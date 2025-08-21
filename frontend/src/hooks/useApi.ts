import { useCallback } from 'react';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { useRouter } from 'next/navigation';

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  request: (config: AxiosRequestConfig) => Promise<AxiosResponse<T>>;
}

export const useApi = <T>(): Omit<ApiResponse<T>, 'data' | 'error' | 'loading'> & {
  data: T | null;
  error: string | null;
  loading: boolean;
  request: (config: AxiosRequestConfig) => Promise<AxiosResponse<T>>;
} => {
  const router = useRouter();

  const getCsrfToken = () => {
    // Get CSRF token from cookies
    const value = `; ${document.cookie}`;
    const parts = value.split(`; csrftoken=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const request = useCallback(async (config: AxiosRequestConfig) => {
    try {
      const token = localStorage.getItem('accessToken');
      const csrfToken = getCsrfToken();
      
      const headers = {
        ...config.headers,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      };

      const response = await axios({
        ...config,
        headers,
        baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
        withCredentials: true,
      });

      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          // If unauthorized, try to refresh the token
          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const refreshResponse = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/token/refresh/`,
                { refresh: refreshToken }
              );

              if (refreshResponse.data.access) {
                localStorage.setItem('accessToken', refreshResponse.data.access);
                
                // Retry the original request with the new token
                const retryConfig = {
                  ...config,
                  headers: {
                    ...config.headers,
                    Authorization: `Bearer ${refreshResponse.data.access}`,
                  },
                };
                
                return await axios({
                  ...retryConfig,
                  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
                });
              }
            }
          } catch (refreshError) {
            // If refresh fails, clear tokens and redirect to login
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            router.push('/login');
          }
        }
        
        // If we get here, either the refresh failed or it wasn't a 401 error
        throw error;
      }
      throw error;
    }
  }, [router]);

  return {
    data: null,
    error: null,
    loading: false,
    request,
  };
};
