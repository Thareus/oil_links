import { useCallback } from 'react';
import { useApi } from './useApi';
import { useRouter } from 'next/navigation';

interface AuthApi {
  login: (email: string, password: string) => Promise<{ access: string; refresh: string; user: any }>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  getUser: () => Promise<any>;
}

export const useAuthApi = (): AuthApi => {
  const api = useApi<any>();
  const router = useRouter();

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.request({
      method: 'POST',
      url: '/auth/token/',
      data: { email, password }
    });
    return response.data;
  }, [api]);

  const register = useCallback(async (email: string, password: string, firstName: string, lastName: string) => {
    // First, get the CSRF token by making a GET request
    await api.request({
      method: 'GET',
      url: '/auth/csrf/',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    // Then make the registration request with the CSRF token
    await api.request({
      method: 'POST',
      url: '/auth/register/',
      data: {
        email,
        password1: password,
        password2: password,
        firstName,
        lastName
      },
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
  }, [api]);

  const logout = useCallback(async () => {
    try {
      await api.request({
        method: 'POST',
        url: '/auth/logout/'
      });
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
    }
  }, [api, router]);

  const getUser = useCallback(async () => {
    const response = await api.request({
      method: 'GET',
      url: '/auth/user/'
    });
    return response.data;
  }, [api]);

  return { login, register, logout, getUser };
};
