/**
 * Salt API Client
 * Handles all API calls to the Salt backend
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new ApiError(response.status, error.message || error.error?.message || 'Request failed');
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
};

const request = async (path: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  
  return handleResponse(response);
};

export const api = {
  // Auth endpoints
  auth: {
    signUp: async (email: string, password: string, displayName?: string) => {
      const data = await request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
      });
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      return data;
    },
    
    signIn: async (email: string, password: string) => {
      const data = await request('/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      return data;
    },
    
    signOut: () => {
      localStorage.removeItem('auth_token');
    },
    
    getCurrentUser: async () => {
      return request('/auth/me');
    },
    
    changePassword: async (currentPassword: string, newPassword: string) => {
      return request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    },
    
    resetPassword: async (email: string) => {
      return request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },
    
    confirmReset: async (token: string, newPassword: string) => {
      return request('/auth/confirm-reset', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
    },

    checkAdmin: async (userId?: string) => {
      if (userId) {
        return request(`/auth/check-admin/${userId}`);
      }
      return request('/auth/check-admin');
    },
  },
  
  // Session endpoints
  sessions: {
    getFeed: async (limit = 50, offset = 0, userId?: string) => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (userId) params.append('user_id', userId);
      return request(`/sessions/feed?${params}`);
    },

    getPublic: async (limit = 50, offset = 0, userId?: string) => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (userId) params.append('user_id', userId);
      return request(`/sessions/public?${params}`);
    },
    
    getById: async (id: string) => {
      return request(`/sessions/${id}`);
    },
    
    getByUser: async (userId: string, limit = 50, offset = 0, currentUserId?: string) => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (currentUserId) params.append('current_user_id', currentUserId);
      return request(`/sessions/user/${userId}?${params}`);
    },
    
    getMedia: async (sessionId: string) => {
      return request(`/sessions/${sessionId}/media`);
    },
    
    getUserMedia: async (userId: string, limit = 50, offset = 0) => {
      return request(`/sessions/user/${userId}/media?limit=${limit}&offset=${offset}`);
    },
    
    create: async (sessionData: any) => {
      return request('/sessions', {
        method: 'POST',
        body: JSON.stringify(sessionData),
      });
    },
    
    update: async (id: string, updates: any) => {
      return request(`/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
    
    delete: async (id: string) => {
      return request(`/sessions/${id}`, {
        method: 'DELETE',
      });
    },
  },
  
  // Board endpoints
  boards: {
    getByUser: async (userId: string) => {
      return request(`/boards/user/${userId}`);
    },
    
    getById: async (id: string) => {
      return request(`/boards/${id}`);
    },
    
    create: async (boardData: any) => {
      return request('/boards', {
        method: 'POST',
        body: JSON.stringify(boardData),
      });
    },
    
    update: async (id: string, updates: any) => {
      return request(`/boards/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
    
    delete: async (id: string) => {
      return request(`/boards/${id}`, {
        method: 'DELETE',
      });
    },
  },
  
  // Profile endpoints
  profiles: {
    getByUserId: async (userId: string) => {
      return request(`/profiles/user/${userId}`);
    },
    
    getById: async (id: string) => {
      return request(`/profiles/${id}`);
    },
    
    update: async (id: string, updates: any) => {
      return request(`/profiles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
    
    search: async (query: string, limit = 50) => {
      return request(`/profiles/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    },
  },
  
  // Saved locations endpoints (for Explore page)
  locations: {
    getByUser: async (userId: string) => {
      return request(`/locations/user/${userId}`);
    },
    
    save: async (locationData: { user_id: string; name: string; latitude: number; longitude: number }) => {
      return request('/locations', {
        method: 'POST',
        body: JSON.stringify(locationData),
      });
    },
    
    delete: async (id: string) => {
      return request(`/locations/${id}`, {
        method: 'DELETE',
      });
    },
  },
  
  // Spot endpoints
  spots: {
    getAll: async (limit = 100, offset = 0, search?: string) => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (search) params.append('search', search);
      return request(`/spots?${params}`);
    },
    
    getById: async (id: string) => {
      return request(`/spots/${id}`);
    },
    
    create: async (spotData: any) => {
      return request('/spots', {
        method: 'POST',
        body: JSON.stringify(spotData),
      });
    },
    
    // Favorite spots
    getFavorites: async (userId: string) => {
      return request(`/spots/favorites/${userId}`);
    },
    
    addFavorite: async (userId: string, spotId: string) => {
      return request('/spots/favorites', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, spot_id: spotId }),
      });
    },
    
    removeFavorite: async (userId: string, spotId: string) => {
      return request(`/spots/favorites/${userId}/${spotId}`, {
        method: 'DELETE',
      });
    },
    
    checkFavorite: async (userId: string, spotId: string) => {
      return request(`/spots/favorites/${userId}/${spotId}`);
    },
    
    // Comments (daily discussion)
    getComments: async (spotId: string, limit = 50, offset = 0) => {
      return request(`/spots/${spotId}/comments?limit=${limit}&offset=${offset}`);
    },
    
    addComment: async (spotId: string, userId: string, content: string, parentId?: string) => {
      return request(`/spots/${spotId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, content, parent_id: parentId }),
      });
    },
    
    // Spot photos
    getPhotos: async (spotId: string, limit = 50, offset = 0) => {
      return request(`/spots/${spotId}/photos?limit=${limit}&offset=${offset}`);
    },
  },
  
  // Social endpoints
  social: {
    likeSession: async (sessionId: string, userId: string) => {
      return request(`/social/sessions/${sessionId}/like`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
    },
    
    unlikeSession: async (sessionId: string, userId: string) => {
      return request(`/social/sessions/${sessionId}/like`, {
        method: 'DELETE',
      });
    },
    
    kookSession: async (sessionId: string, userId: string) => {
      return request(`/social/sessions/${sessionId}/kook`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
    },
    
    unkookSession: async (sessionId: string, userId: string) => {
      return request(`/social/sessions/${sessionId}/kook`, {
        method: 'DELETE',
      });
    },
    
    getComments: async (sessionId: string) => {
      return request(`/social/sessions/${sessionId}/comments`);
    },
    
    addComment: async (sessionId: string, userId: string, content: string) => {
      return request(`/social/sessions/${sessionId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, content }),
      });
    },
    
    deleteComment: async (commentId: string) => {
      return request(`/social/comments/${commentId}`, {
        method: 'DELETE',
      });
    },
    
    follow: async (followerId: string, followingId: string) => {
      return request('/social/follow', {
        method: 'POST',
        body: JSON.stringify({ follower_id: followerId, following_id: followingId }),
      });
    },
    
    unfollow: async (followerId: string, followingId: string) => {
      return request(`/social/follow/${followingId}`, {
        method: 'DELETE',
      });
    },
    
    getFollowers: async (userId: string) => {
      return request(`/social/followers/${userId}`);
    },
    
    getFollowing: async (userId: string) => {
      return request(`/social/following/${userId}`);
    },
    
    getFollowStats: async (userId: string, currentUserId: string) => {
      return request(`/social/follow-stats/${userId}?current_user=${currentUserId}`);
    },
    
    getConnections: async (userId: string, currentUserId: string) => {
      return request(`/social/connections/${userId}?current_user=${currentUserId}`);
    },
    
    getTopSurfers: async (excludeUserId: string, limit = 5) => {
      return request(`/social/top-surfers?exclude=${excludeUserId}&limit=${limit}`);
    },
  },

  // Forecast/Daily Discussion endpoints
  forecast: {
    getComments: async (spotId: string, userId?: string) => {
      const params = new URLSearchParams();
      if (userId) params.append('user_id', userId);
      return request(`/forecast/spots/${spotId}/comments?${params}`);
    },

    addComment: async (spotId: string, content: string, parentId?: string) => {
      return request(`/forecast/spots/${spotId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, parent_id: parentId }),
      });
    },

    likeComment: async (commentId: string) => {
      return request(`/forecast/comments/${commentId}/like`, {
        method: 'POST',
      });
    },

    unlikeComment: async (commentId: string) => {
      return request(`/forecast/comments/${commentId}/like`, {
        method: 'DELETE',
      });
    },

    kookComment: async (commentId: string) => {
      return request(`/forecast/comments/${commentId}/kook`, {
        method: 'POST',
      });
    },

    unkookComment: async (commentId: string) => {
      return request(`/forecast/comments/${commentId}/kook`, {
        method: 'DELETE',
      });
    },

    deleteComment: async (commentId: string) => {
      return request(`/forecast/comments/${commentId}`, {
        method: 'DELETE',
      });
    },
  },

  // Admin endpoints
  admin: {
    promoteToAdmin: async (userId: string) => {
      return request(`/admin/users/${userId}/promote`, {
        method: 'POST',
      });
    },

    removeAdmin: async (userId: string) => {
      return request(`/admin/users/${userId}/admin`, {
        method: 'DELETE',
      });
    },

    deleteUser: async (userId: string) => {
      return request(`/admin/users/${userId}`, {
        method: 'DELETE',
      });
    },
  },
  
  // Upload endpoints
  upload: {
    sessionMedia: async (files: File[], sessionId: string, userId: string) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('session_id', sessionId);
      formData.append('user_id', userId);
      
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/upload/session-media`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      
      return handleResponse(response);
    },
    
    avatar: async (file: File, userId: string) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', userId);
      
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/upload/avatar`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      
      return handleResponse(response);
    },
    
    boardPhoto: async (file: File, boardId: string, userId: string) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('board_id', boardId);
      formData.append('user_id', userId);
      
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/upload/board-photo`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      
      return handleResponse(response);
    },
    
    deleteFile: async (bucket: string, objectName: string) => {
      return request('/upload/file', {
        method: 'DELETE',
        body: JSON.stringify({ bucket, objectName }),
      });
    },
  },
};

export { ApiError };
export default api;
