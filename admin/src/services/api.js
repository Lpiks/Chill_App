import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/admin',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const adminService = {
  login: (credentials) => api.post('/auth/login', credentials),
  getStats: () => api.get('/stats'),
  
  // Users
  getUsers: (params) => api.get('/users', { params }),
  createUser: (data) => api.post('/users', data),
  getUserDetail: (id) => api.get(`/users/${id}/detail`),
  suspendUser: (id) => api.put(`/users/${id}/suspend`),
  banUser: (id) => api.put(`/users/${id}/ban`),
  deleteUser: (id) => api.delete(`/users/${id}`),
  updateSubscription: (id, tier) => api.put(`/users/${id}/subscription`, { tier }),

  // Content Moderation
  getPosts: (params) => api.get('/posts', { params }),
  hidePost: (id) => api.put(`/posts/${id}/hide`),
  deletePost: (id) => api.delete(`/posts/${id}`),

  // Reports
  getReports: (params) => api.get('/reports', { params }),
  resolveReport: (id, action) => api.put(`/reports/${id}/resolve`, { action }),

  // Revenue
  getRevenueSummary: () => api.get('/revenue/summary'),
  getRevenueTransactions: (params) => api.get('/revenue/transactions', { params }),

  // Trending
  getTrending: (category) => api.get('/trending', { params: { category } }),
  pinTrending: (tmdbId) => api.put(`/trending/${tmdbId}/pin`),
  recalculateTrending: () => api.post('/trending/recalculate'),

  // Streams
  getStreamStatus: () => api.get('/streams/status'),
  getPopularStreams: () => api.get('/streams/popular'),
  clearCache: () => api.delete('/streams/cache'),

  // Notifications
  sendNotification: (data) => api.post('/notifications/send', data),

  // Settings
  getSettings: () => api.get('/settings'),
  updateSettings: (data) => api.put('/settings', data),
};

export default api;
