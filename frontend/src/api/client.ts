import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { ApiResponse, ApiError, Book, User, UserStatistics, ReadingLog, CommunityActivity } from '@/types';

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
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      window.location.href = '/login';
    }
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
  
  // Book-related endpoints
  books: {
    getAll: (filters?: any) => api.get<Book[]>('/books', filters),
    getById: (uid: string) => api.get<Book>(`/books/${uid}`),
    create: (data: any) => api.post<Book>('/books', data),
    update: (uid: string, data: any) => api.put<Book>(`/books/${uid}`, data),
    delete: (uid: string) => api.delete(`/books/${uid}`),
    lookup: (isbn: string) => api.get<any>(`/books/lookup/${isbn}`),
    updateStatus: (uid: string, status: string) => 
      api.put<Book>(`/books/${uid}/status`, { status }),
    logReading: (uid: string, data: any) => 
      api.post<any>(`/books/${uid}/reading-log`, data),
  },
  
  // User-related endpoints
  user: {
    getProfile: () => api.get<User>('/user/profile'),
    updateProfile: (data: any) => api.put<User>('/user/profile', data),
    getStatistics: () => api.get<UserStatistics>('/user/statistics'),
    getReadingHistory: () => api.get<ReadingLog[]>('/user/reading-history'),
  },
  
  // Community endpoints
  community: {
    getActivity: () => api.get<CommunityActivity>('/community/activity'),
  },
  
  // System endpoints (admin only)
  system: {
    getSettings: () => api.get<any>('/system/settings'),
    updateSettings: (data: any) => api.put<any>('/system/settings', data),
  },
};

export default apiClient; 