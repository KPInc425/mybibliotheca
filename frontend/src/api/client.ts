import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { ApiResponse, Book, User, UserStatistics, ReadingLog, CommunityActivity } from '@/types';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true, // Important for session-based auth
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add any request headers here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Check if response is HTML instead of JSON (indicates redirect to frontend)
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('text/html') && !contentType.includes('application/json')) {
      console.error('[API Client] Received HTML response instead of JSON:', {
        url: response.config.url,
        status: response.status,
        contentType: contentType,
        data: response.data.substring(0, 200) + '...' // First 200 chars
      });
      throw new Error('Received HTML response instead of JSON - backend may not be running');
    }
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      window.location.href = '/login';
    }
    
    // Log detailed error information
    console.error('[API Client] Request failed:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    return Promise.reject(error);
  }
);

// API helper functions
export const api = {
  // Generic request methods
  get: <T>(url: string, params?: any): Promise<ApiResponse<T>> =>
    apiClient.get(url, { params }).then(res => res.data),
  
  post: <T>(url: string, data?: any): Promise<ApiResponse<T>> =>
    apiClient.post(url, data).then(res => res.data),
  
  put: <T>(url: string, data?: any): Promise<ApiResponse<T>> =>
    apiClient.put(url, data).then(res => res.data),
  
  delete: <T>(url: string): Promise<ApiResponse<T>> =>
    apiClient.delete(url).then(res => res.data),
  
  // Auth endpoints
  auth: {
    login: (data: { username: string; password: string; remember_me?: boolean }) =>
      api.post<any>('/auth/login', data),
    logout: () => api.post<any>('/auth/logout'),
    changePassword: (data: { current_password: string; new_password: string }) =>
      api.post<any>('/auth/change-password', data),
  },
  
  // User invite endpoints
  userInvites: {
    getInvites: () => api.get<any>('/user/invites'),
    createInvite: (data: { email?: string; expires_in_days?: number }) => api.post<any>('/user/invites', data),
    deleteInvite: (inviteId: number) => api.delete<any>(`/user/invites/${inviteId}`),
  },
  
  // Profile picture endpoints
  profile: {
    uploadPicture: (file: File) => {
      const formData = new FormData();
      formData.append('profile_picture', file);
      return apiClient.post('/user/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    deletePicture: () => api.delete<any>('/user/profile-picture'),
  },
  
  // Book rating endpoints
  ratings: {
    rateBook: (bookId: number, data: { rating: number; review?: string }) => 
      api.post<any>(`/books/${bookId}/rate`, data),
    getBookRating: (bookId: number) => api.get<any>(`/books/${bookId}/rate`),
    deleteBookRating: (bookId: number) => api.delete<any>(`/books/${bookId}/rate`),
    getBookRatings: (bookId: number) => api.get<any>(`/books/${bookId}/ratings`),
  },
  
  // Book-related endpoints
  books: {
    getAll: (params?: any) => api.get<Book[]>('/books', params),
    getById: (uid: string) => api.get<Book>(`/books/${uid}`),
    create: (data: any) => api.post<Book>('/books', data),
    update: (uid: string, data: any) => api.put<Book>(`/books/${uid}`, data),
    delete: (uid: string) => api.delete(`/books/${uid}`),
    updateStatus: (uid: string, data: any) => api.put<Book>(`/books/${uid}/status`, data),
    addReadingLog: (uid: string, data: any) => api.post<ReadingLog>(`/books/${uid}/reading-log`, data),
    getReadingLogs: (uid: string) => api.get<ReadingLog[]>(`/books/${uid}/reading-logs`),
    logReading: (uid: string, data: any) => api.post<ReadingLog>(`/books/${uid}/reading-log`, data),
    lookup: (isbn: string) => api.get<any>(`/books/lookup/${isbn}`),
    getPublic: (filter?: string) => api.get<Book[]>(`/books/public`, { params: { filter } }),
    search: (query: string, page = 1, pageSize = 20) => api.get<any>(`/books/search?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`),
    uploadCover: (uid: string, file: File) => {
      const form = new FormData();
      form.append('cover_image', file);
      return apiClient.post(`/books/${uid}/cover`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    deleteCover: (uid: string) => api.delete<any>(`/books/${uid}/cover`),
  },

  // Reports endpoints
  reports: {
    getMonthWrapup: (year: number, month: number) => api.get<any>(`/reports/month-wrapup/${year}/${month}`),
  },

  // User-related endpoints
  user: {
    getProfile: () => api.get<User>('/user/profile'),
    updateProfile: (data: Partial<User>) => api.put<User>('/user/profile', data),
    getStatistics: () => api.get<UserStatistics>('/user/statistics'),
    getReadingHistory: () => api.get<ReadingLog[]>('/user/reading-history'),
    getPublicProfile: (userId: string) => api.get<any>(`/user/${userId}/profile`),
  },
  
  // Community endpoints
  community: {
    getActivity: () => api.get<CommunityActivity>('/community/activity'),
    getActiveReaders: () => api.get<any>('/community/active-readers'),
    getBooksThisMonth: () => api.get<any>('/community/books-this-month'),
    getCurrentlyReading: () => api.get<any>('/community/currently-reading'),
    getRecentActivity: () => api.get<any>('/community/recent-activity'),
  },
  
  // System endpoints (admin only)
  system: {
    getSettings: () => api.get<any>('/system/settings'),
    updateSettings: (data: any) => api.put<any>('/system/settings', data),
  },
  
  // Admin endpoints (admin only)
                admin: {
                getStats: () => api.get<any>('/admin/stats'),
                getRecentUsers: () => api.get<any[]>('/admin/users/recent'),
                getUsers: (params?: any) => api.get<any>('/admin/users', params),
                getUser: (userId: string) => api.get<any>(`/admin/users/${userId}`),
                createUser: (data: { username: string; email: string; password: string }) => api.post<any>('/admin/users', data),
                toggleUserAdmin: (userId: string) => api.post<any>(`/admin/users/${userId}/toggle-admin`),
                toggleUserActive: (userId: string) => api.post<any>(`/admin/users/${userId}/toggle-active`),
                toggleUserPro: (userId: string) => api.post<any>(`/admin/users/${userId}/toggle-pro`),
                deleteUser: (userId: string) => api.post<any>(`/admin/users/${userId}/delete`),
                resetUserPassword: (userId: string) => api.post<any>(`/admin/users/${userId}/reset-password`),
                unlockUserAccount: (userId: string) => api.post<any>(`/admin/users/${userId}/unlock`),
                getSettings: () => api.get<any>('/system/settings'),
                updateSettings: (data: any) => api.put<any>('/system/settings', data),
                resetSettings: () => api.post<any>('/system/settings/reset'),
                createBackup: () => api.post<any>('/admin/backup'),
                // Return raw axios response to preserve headers and blob
                downloadBackup: () => apiClient.get('/admin/backup/download', { responseType: 'blob' }),
                getBackupStatus: () => api.get<any>('/admin/backup/status'),
                // Invite management
                getInvites: () => api.get<any[]>('/admin/invites'),
                createInvite: (data: { email?: string; expires_in_days?: number }) => api.post<any>('/admin/invites', data),
                deleteInvite: (inviteId: number) => api.delete<any>(`/admin/invites/${inviteId}`),
                // Grant tokens to users
                grantUserTokens: (userId: string, count: number) => api.post<any>(`/admin/users/${userId}/grant-tokens`, { count }),
              },
};

export default apiClient; 