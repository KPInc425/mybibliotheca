// User Types
export interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  share_current_reading: boolean;
  share_library: boolean;
  share_reading_activity: boolean;
  debug_enabled: boolean;
  created_at: string;
}

// Book Types
export interface Book {
  id: number;
  uid: string;
  title: string;
  author: string;
  isbn?: string;
  cover_url?: string;
  description?: string;
  published_date?: string;
  page_count?: number;
  publisher?: string;
  language?: string;
  categories?: string;
  average_rating?: number;
  rating_count?: number;
  start_date?: string;
  finish_date?: string;
  want_to_read: boolean;
  library_only: boolean;
  user_id: number;
  created_at: string;
}

// Reading Log Types
export interface ReadingLog {
  id: number;
  book_id: number;
  user_id: number;
  pages_read: number;
  date: string;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

// Book Status Types
export type BookStatus = 'currently_reading' | 'finished' | 'want_to_read' | 'library_only';

// Filter Types
export interface BookFilters {
  status?: BookStatus;
  search?: string;
  category?: string;
  publisher?: string;
  language?: string;
}

// Statistics Types
export interface UserStatistics {
  total_books: number;
  currently_reading: number;
  finished_books: number;
  want_to_read: number;
  reading_streak: number;
  monthly_pages: number;
  recent_activity: ReadingLog[];
}

// Community Types
export interface CommunityActivity {
  active_readers: number;
  books_this_month: number;
  currently_reading: number;
  recent_activity: ReadingLog[];
}

// Form Types
export interface LoginForm {
  username: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface AddBookForm {
  title: string;
  author: string;
  isbn?: string;
  cover_url?: string;
  description?: string;
  published_date?: string;
  page_count?: number;
  publisher?: string;
  language?: string;
  categories?: string;
}

export interface ReadingLogForm {
  pages_read: number;
  date?: string;
}

// Navigation Types
export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number;
}

// Theme Types
export type Theme = 'light' | 'dark' | 'system';

// Error Types
export interface ApiError {
  message: string;
  status: number;
  details?: any;
} 