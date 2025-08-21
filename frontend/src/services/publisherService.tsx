import { apiClient } from '@/lib/api';

export interface Publisher {
  id: number;
  name: string;
  website: string;
  created_at: string;
  hidden: boolean
  publication_count?: number;
  visible_publications_count?: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

let publishersCache: Publisher[] | null = null;
let publishersCacheTs = 0;
const PUBLISHERS_TTL = 5 * 60 * 1000; // 5 minutes

function readCacheFromStorage() {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('publishers_cache');
    const ts = localStorage.getItem('publishers_cache_ts');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) publishersCache = parsed as Publisher[];
    }
    if (ts) publishersCacheTs = parseInt(ts, 10) || 0;
  } catch {
    // ignore storage errors
  }
}

function writeCacheToStorage(pubs: Publisher[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('publishers_cache', JSON.stringify(pubs));
    localStorage.setItem('publishers_cache_ts', String(Date.now()));
  } catch {
    // ignore storage errors
  }
}

const publisherService = {
  // Get all sources for the current user
  async getPublishers(forceRefresh = false): Promise<Publisher[]> {
    const now = Date.now();
    if (!publishersCache) readCacheFromStorage();
    if (!forceRefresh && publishersCache && (now - publishersCacheTs) < PUBLISHERS_TTL) {
      return publishersCache;
    }

    const response = await apiClient.request('/sources/publishers/');
    let pubs: Publisher[] = [];
    if (response && typeof response === 'object' && 'results' in response) {
      pubs = Array.isArray((response as any).results) ? (response as any).results : [];
    } else if (Array.isArray(response)) {
      pubs = response as Publisher[];
    }
    publishersCache = pubs;
    publishersCacheTs = now;
    writeCacheToStorage(pubs);
    return pubs;
  },

  // Paginated list of publishers with filters/sorting
  async listPublishers(params: {
    limit?: number;
    offset?: number;
    q?: string;
    hidden?: boolean;
    ordering?: string; // e.g., name, -created_at
  }): Promise<PaginatedResponse<Publisher>> {
    const sp = new URLSearchParams();
    if (params.limit != null) sp.set('limit', String(params.limit));
    if (params.offset != null) sp.set('offset', String(params.offset));
    if (params.q) sp.set('q', params.q);
    if (typeof params.hidden === 'boolean') sp.set('hidden', String(params.hidden));
    if (params.ordering) sp.set('ordering', params.ordering);
    const endpoint = `/sources/publishers/${sp.toString() ? `?${sp.toString()}` : ''}`;
    return await apiClient.request(endpoint);
  },

  // Update a publisher
  async updatePublisher(
    id: number,
    publisherData: { name?: string; website?: string; hidden?: boolean }
  ): Promise<Publisher> {
    const updated = await apiClient.request(`/sources/publishers/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(publisherData),
    });
    // Update or invalidate cache
    if (publishersCache && Array.isArray(publishersCache)) {
      const idx = publishersCache.findIndex((p) => p.id === id);
      if (idx >= 0) {
        publishersCache = [
          ...publishersCache.slice(0, idx),
          { ...publishersCache[idx], ...updated },
          ...publishersCache.slice(idx + 1),
        ];
        publishersCacheTs = Date.now();
        writeCacheToStorage(publishersCache);
      } else {
        // if not found, append and store
        publishersCache = [...publishersCache, updated];
        publishersCacheTs = Date.now();
        writeCacheToStorage(publishersCache);
      }
    } else {
      // no cache present; create it
      publishersCache = [updated];
      publishersCacheTs = Date.now();
      writeCacheToStorage(publishersCache);
    }
    return updated;
  },
};

export default publisherService;
