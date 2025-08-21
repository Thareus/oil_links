import { apiClient } from '@/lib/api';

export interface Story {
  id: number;
  title: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  is_current?: boolean;
  sources?: Array<{
    id: number;
    title: string;
    link: string;
    publisher_name: string;
    published_at: string;
  }>;
}

const storyService = {
  // Get all stories for the current user
  async getStories(): Promise<Story[]> {
    const response = await apiClient.request('/stories/');
    // Ensure we always return an array, even if the response is null/undefined or not an array
    return Array.isArray(response) ? response : [];
  },

  // Get a single story by ID with its related publications
  async getStory(id: number): Promise<Story> {
    const story = await apiClient.request(`/stories/${id}/`);
    // Fetch related publications if not included in the initial response
    if (story && !story.sources) {
      const sources = await apiClient.request(`/stories/${id}/sources/`);
      return { ...story, sources };
    }
    return story;
  },

  // Create a new story
  async createStory(storyData: { title: string; notes?: string }): Promise<Story> {
    return await apiClient.request('/stories/', {
      method: 'POST',
      body: JSON.stringify(storyData),
    });
  },

  // Update a story
  async updateStory(
    id: number,
    storyData: { title?: string; notes?: string; is_current?: boolean }
  ): Promise<Story> {
    return await apiClient.request(`/stories/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(storyData),
    });
  },

  // Delete a story
  async deleteStory(id: number): Promise<void> {
    await apiClient.request(`/stories/${id}/`, {
      method: 'DELETE',
    });
  },

  // Set a story as current
  async setCurrentStory(id: number): Promise<Story> {
    return await apiClient.request(`/stories/${id}/set_current/`, {
      method: 'POST',
    });
  },

  // Add a publication to a story (many-to-many link)
  async addSourceToStory(storyId: number, sourceId: number): Promise<void> {
    await apiClient.request(`/stories/${storyId}/add_source/`, {
      method: 'POST',
      body: JSON.stringify({ source_id: sourceId }),
    });
  },

  // Remove a publication from a story (many-to-many unlink)
  async removeSourceFromStory(storyId: number, sourceId: number): Promise<void> {
    await apiClient.request(`/stories/${storyId}/remove_source/`, {
      method: 'POST',
      body: JSON.stringify({ source_id: sourceId }),
    });
  },
};

export default storyService;
