import { apiClient } from '@/lib/api';

export interface Publication {
  id: number;
  title: string;
  link: string;
  publisher: number; // publisher id
  publisher_name: string;
  published_at: string;
  created_at: string;
  hidden?: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const publicationService = {
  // Get all sources for the current user
  async getPublications(): Promise<Publication[]> {
    const response = await apiClient.request('/sources/publications/')
    // If pagination is enabled, unwrap results; otherwise accept array
    if (response && typeof response === 'object' && 'results' in response) {
      return Array.isArray(response.results) ? response.results : [];
    }
    return Array.isArray(response) ? response : [];
  },

  // Paginated list with filters/sorting
  async listPublications(params: {
    limit?: number;
    offset?: number;
    q?: string;
    start?: string; // yyyy-mm-dd
    end?: string;   // yyyy-mm-dd
    sources?: string[]; // publisher names
    ordering?: string; // e.g. -published_at, title, publisher__name
  }): Promise<PaginatedResponse<Publication>> {
    const sp = new URLSearchParams();
    if (params.limit != null) sp.set('limit', String(params.limit));
    if (params.offset != null) sp.set('offset', String(params.offset));
    if (params.q) sp.set('q', params.q);
    if (params.start) sp.set('start', params.start);
    if (params.end) sp.set('end', params.end);
    if (params.sources && params.sources.length) {
      // Backend accepts repeated source params or comma-separated
      params.sources.forEach((s) => sp.append('source', s));
    }
    if (params.ordering) sp.set('ordering', params.ordering);

    const endpoint = `/sources/publications/${sp.toString() ? `?${sp.toString()}` : ''}`;
    return await apiClient.request(endpoint);
  },

  // Same list, but only visible (not hidden and publisher not hidden)
  async listVisiblePublications(params: {
    limit?: number;
    offset?: number;
    q?: string;
    start?: string; // yyyy-mm-dd
    end?: string;   // yyyy-mm-dd
    sources?: string[]; // publisher names
    ordering?: string; // e.g. -published_at, title, publisher__name
  }): Promise<PaginatedResponse<Publication>> {
    const sp = new URLSearchParams();
    if (params.limit != null) sp.set('limit', String(params.limit));
    if (params.offset != null) sp.set('offset', String(params.offset));
    if (params.q) sp.set('q', params.q);
    if (params.start) sp.set('start', params.start);
    if (params.end) sp.set('end', params.end);
    if (params.sources && params.sources.length) {
      params.sources.forEach((s) => sp.append('source', s));
    }
    if (params.ordering) sp.set('ordering', params.ordering);

    const endpoint = `/sources/publications/visible/${sp.toString() ? `?${sp.toString()}` : ''}`;
    return await apiClient.request(endpoint);
  },

  async getMeta(): Promise<{ latest_published: string | null; total: number }> {
    return await apiClient.request('/sources/meta/');
  },

  // Create a new publication
  async createPublication(publicationData: { title: string; link: string; publisher: string; published_at: string }): Promise<Publication> {
    return await apiClient.request('/sources/publications/', {
      method: 'POST',
      body: JSON.stringify(publicationData),
    });
  },

  // Update a publication
  async updatePublication(
    id: number,
    publicationData: { title?: string; link?: string; publisher?: string; published_at?: string; hidden?: boolean }
  ): Promise<Publication> {
    return await apiClient.request(`/sources/publications/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(publicationData),
    });
  },

  // Delete a publication
  async deletePublication(id: number): Promise<void> {
    await apiClient.request(`/sources/publications/${id}/`, {
      method: 'DELETE',
    });
  },
};

export default publicationService;
