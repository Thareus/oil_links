
class APIError extends Error {
    status: number;
    data: any;
    
    constructor(message: string, status: number, data: any) {
      super(message);
      this.name = 'APIError';
      this.status = status;
      this.data = data;
    }
  }
  
class APIClient {
  baseURL: string;
  constructor(baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1') {
    this.baseURL = baseURL;
  }

  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  }

  async request(endpoint: string, options: any = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Get token from localStorage if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    
    // Merge headers without allowing options.headers to overwrite them later
    const mergedHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const { headers: _discardedHeaders, ...restOptions } = options;

    const config: RequestInit & { headers: Record<string, string> } = {
      credentials: 'include',
      ...restOptions,
      headers: mergedHeaders,
    };

    // Helper: attempt to refresh tokens (supports cookie or body refresh)
    const tryRefresh = async (): Promise<boolean> => {
      try {
        const refreshUrl = `${this.baseURL}/auth/token/refresh/`;
        // Prefer refresh from storage; fall back to cookie-based refresh
        const storedRefresh = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
        const refreshResp = await fetch(refreshUrl, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(storedRefresh ? { refresh: storedRefresh } : {}),
        });
        const refreshData = await refreshResp.json().catch(() => ({}));
        if (!refreshResp.ok) return false;
        // Update tokens from response (rotation may issue new refresh)
        if (typeof window !== 'undefined') {
          if (refreshData?.access) localStorage.setItem('access_token', refreshData.access);
          if (refreshData?.refresh) localStorage.setItem('refresh_token', refreshData.refresh);
        }
        return !!refreshData?.access;
      } catch {
        return false;
      }
    };

    try {
      // First attempt
      let response = await fetch(url, config);
      let data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const isAuthError = response.status === 401 && (
          (data && (data.code === 'token_not_valid' || data?.detail === 'Given token not valid for any token type')) ||
          (Array.isArray(data?.messages) && data.messages.some((m: any) => /expired|not valid/i.test(m?.message || '')))
        );

        if (isAuthError && await tryRefresh()) {
          // Retry once with new access token
          const newAccess = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
          const retryHeaders: Record<string, string> = {
            ...mergedHeaders,
            ...(newAccess ? { Authorization: `Bearer ${newAccess}` } : {}),
          };
          response = await fetch(url, { ...config, headers: retryHeaders });
          data = await response.json().catch(() => ({}));
          if (response.ok) return data;
        }

        throw new APIError(
          data?.message || data?.detail || 'An error occurred',
          response.status,
          data
        );
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('Network error occurred', 500, null);
    }
  }

  private async ensureCsrfCookie() {
    // Hit the CSRF endpoint to set the cookie
    await this.request('/auth/csrf/', {
      method: 'GET',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
  }

  // Authentication endpoints
  async register(userData: any) {
    // Ensure CSRF cookie exists and include token header
    await this.ensureCsrfCookie();
    const csrf = this.getCookie('csrftoken');
    return this.request('/auth/register/', {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        ...(csrf ? { 'X-CSRFToken': csrf } : {}),
      },
      body: JSON.stringify({
        email: userData.email,
        password1: userData.password,
        password2: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
      }),
    });
  }

  async login(credentials: any) {
    return this.request('/auth/token/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout(refreshToken: any) {
    // CSRF is not strictly required for JWT logout here, but include it for safety
    const csrf = this.getCookie('csrftoken');
    return this.request('/auth/logout/', {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        ...(csrf ? { 'X-CSRFToken': csrf } : {}),
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });
  }

  async refreshToken(refreshToken?: any) {
    // If no token provided, CookieTokenRefreshView will use the cookie
    return this.request('/auth/token/refresh/', {
      method: 'POST',
      body: JSON.stringify(refreshToken ? { refresh: refreshToken } : {}),
    });
  }

  async getCurrentUser() {
    return this.request('/auth/user/');
  }

  async forgotPassword(email: any) {
    return this.request('/auth/password-reset/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: any, newPassword: any) {
    return this.request('/auth/password-reset/confirm/', {
      method: 'POST',
      body: JSON.stringify({ token, password: newPassword }),
    });
  }

  async changePassword(currentPassword: any, newPassword: any) {
    return this.request('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify({
        old_password: currentPassword,
        new_password: newPassword,
      }),
    });
  }
}

export const apiClient = new APIClient();
