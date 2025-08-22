
class APIError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}
  
type RegisterInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

type LoginCredentials = {
  email: string;
  password: string;
};

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

  async request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Get token from localStorage if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    
    // Convert headers to a plain object if they're provided as a Headers object
    const normalizeHeaders = (headers: HeadersInit | undefined): Record<string, string> => {
      if (!headers) return {};
      if (headers instanceof Headers) {
        const result: Record<string, string> = {};
        headers.forEach((value, key) => {
          result[key] = value;
        });
        return result;
      }
      if (Array.isArray(headers)) {
        return Object.fromEntries(headers);
      }
      return headers as Record<string, string>;
    };

    // Create config with merged headers
    const config: RequestInit & { headers: Record<string, string> } = {
      credentials: 'include',
      ...options, // Spread all other options first
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...normalizeHeaders(options.headers),
      },
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
        const refreshData: unknown = await refreshResp.json().catch(() => ({}));
        if (!refreshResp.ok) return false;
        // Update tokens from response (rotation may issue new refresh)
        if (typeof window !== 'undefined') {
          if (isRecord(refreshData) && typeof refreshData.access === 'string') {
            localStorage.setItem('access_token', refreshData.access);
          }
          if (isRecord(refreshData) && typeof refreshData.refresh === 'string') {
            localStorage.setItem('refresh_token', refreshData.refresh);
          }
        }
        return isRecord(refreshData) && typeof refreshData.access === 'string';
      } catch {
        return false;
      }
    };

    try {
      // First attempt
      let response = await fetch(url, config);
      let data: unknown = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Process error data without creating an unused variable
        const code = isRecord(data) && typeof data.code === 'string' ? data.code : undefined;
        const detail = isRecord(data) && typeof data.detail === 'string' ? data.detail : undefined;
        const messages = isRecord(data) && Array.isArray(data.messages) ? data.messages : [];
        const hasExpiredMessage = messages.some(
          (m) => isRecord(m) && typeof m.message === 'string' && /expired|not valid/i.test(m.message)
        );
        const isAuthError =
          response.status === 401 && (
            (!!code && code === 'token_not_valid') ||
            (!!detail && detail === 'Given token not valid for any token type') ||
            hasExpiredMessage
          );

        if (isAuthError && await tryRefresh()) {
          // Retry once with new access token
          const newAccess = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
          response = await fetch(url, {
            ...config,
            headers: {
              ...config.headers,
              ...(newAccess ? { Authorization: `Bearer ${newAccess}` } : {})
            }
          });
          data = await response.json().catch(() => ({}));
          if (response.ok) return data as T;
        }

        throw new APIError(
          (isRecord(data) && typeof data.message === 'string' && data.message) ||
            (isRecord(data) && typeof data.detail === 'string' && data.detail) ||
            'An error occurred',
          response.status,
          data
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('Network error occurred', 500, null);
    }
  }

  private async ensureCsrfCookie(): Promise<void> {
    // Hit the CSRF endpoint to set the cookie
    await this.request('/auth/csrf/', {
      method: 'GET',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
  }

  // Authentication endpoints
  async register(userData: RegisterInput): Promise<unknown> {
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

  async login(credentials: LoginCredentials): Promise<unknown> {
    return this.request('/auth/token/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout(refreshToken: string): Promise<unknown> {
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

  async refreshToken(refreshToken?: string): Promise<unknown> {
    // If no token provided, CookieTokenRefreshView will use the cookie
    return this.request('/auth/token/refresh/', {
      method: 'POST',
      body: JSON.stringify(refreshToken ? { refresh: refreshToken } : {}),
    });
  }

  async getCurrentUser(): Promise<unknown> {
    return this.request('/auth/user/');
  }

  async forgotPassword(email: string): Promise<unknown> {
    return this.request('/auth/password-reset/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<unknown> {
    return this.request('/auth/password-reset/confirm/', {
      method: 'POST',
      body: JSON.stringify({ token, password: newPassword }),
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<unknown> {
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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
