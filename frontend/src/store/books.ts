import { create } from 'zustand';
import type { Book, BookFilters, BookStatus } from '@/types';
import { api } from '@/api/client';

interface BooksState {
  books: Book[];
  currentBook: Book | null;
  isLoading: boolean;
  error: string | null;
  filters: BookFilters;
}

interface BooksActions {
  setBooks: (books: Book[]) => void;
  setCurrentBook: (book: Book | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: BookFilters) => void;
  clearError: () => void;
  
  // API Actions
  fetchBooks: (filters?: BookFilters) => Promise<void>;
  fetchBook: (uid: string) => Promise<void>;
  addBook: (bookData: any) => Promise<void>;
  updateBook: (uid: string, bookData: any) => Promise<void>;
  deleteBook: (uid: string) => Promise<void>;
  updateBookStatus: (uid: string, status: BookStatus) => Promise<void>;
  logReading: (uid: string, pagesRead: number, date?: string) => Promise<void>;
  lookupBook: (isbn: string) => Promise<any>;
}

type BooksStore = BooksState & BooksActions;

export const useBooksStore = create<BooksStore>((set, get) => ({
  // State
  books: [],
  currentBook: null,
  isLoading: false,
  error: null,
  filters: {},

  // Actions
  setBooks: (books) => set({ books }),
  setCurrentBook: (book) => set({ currentBook: book }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setFilters: (filters) => set({ filters }),
  clearError: () => set({ error: null }),

  // API Actions
  fetchBooks: async (filters = {}) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.books.getAll(filters);
      if (response.success && response.data) {
        set({ books: response.data, filters });
      } else {
        set({ error: response.error || 'Failed to fetch books' });
      }
    } catch (error) {
      set({ error: 'Failed to fetch books' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchBook: async (uid: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.books.getById(uid);
      if (response.success && response.data) {
        set({ currentBook: response.data });
      } else {
        set({ error: response.error || 'Failed to fetch book' });
      }
    } catch (error) {
      set({ error: 'Failed to fetch book' });
    } finally {
      set({ isLoading: false });
    }
  },

  addBook: async (bookData) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.books.create(bookData);
      if (response.success && response.data) {
        const { books } = get();
        set({ books: [...books, response.data] });
      } else {
        set({ error: response.error || 'Failed to add book' });
      }
    } catch (error) {
      set({ error: 'Failed to add book' });
    } finally {
      set({ isLoading: false });
    }
  },

  updateBook: async (uid: string, bookData) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.books.update(uid, bookData);
      if (response.success && response.data) {
        const { books } = get();
        const updatedBooks = books.map(book => 
          book.uid === uid ? response.data : book
        ).filter((book): book is Book => book !== undefined);
        set({ books: updatedBooks, currentBook: response.data });
      } else {
        set({ error: response.error || 'Failed to update book' });
      }
    } catch (error) {
      set({ error: 'Failed to update book' });
    } finally {
      set({ isLoading: false });
    }
  },

  deleteBook: async (uid: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.books.delete(uid);
      if (response.success) {
        const { books } = get();
        const filteredBooks = books.filter(book => book.uid !== uid);
        set({ books: filteredBooks, currentBook: null });
      } else {
        set({ error: response.error || 'Failed to delete book' });
      }
    } catch (error) {
      set({ error: 'Failed to delete book' });
    } finally {
      set({ isLoading: false });
    }
  },

  updateBookStatus: async (uid: string, status: BookStatus) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.books.updateStatus(uid, status);
      if (response.success && response.data) {
        const { books } = get();
        const updatedBooks = books.map(book => 
          book.uid === uid ? response.data : book
        ).filter((book): book is Book => book !== undefined);
        set({ books: updatedBooks, currentBook: response.data });
      } else {
        set({ error: response.error || 'Failed to update book status' });
      }
    } catch (error) {
      set({ error: 'Failed to update book status' });
    } finally {
      set({ isLoading: false });
    }
  },

  logReading: async (uid: string, pagesRead: number, date?: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.books.logReading(uid, { pages_read: pagesRead, date });
      if (response.success) {
        // Refresh the current book to show updated progress
        await get().fetchBook(uid);
      } else {
        set({ error: response.error || 'Failed to log reading' });
      }
    } catch (error) {
      set({ error: 'Failed to log reading' });
    } finally {
      set({ isLoading: false });
    }
  },

  lookupBook: async (isbn: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.books.lookup(isbn);
      if (response.success) {
        return response.data;
      } else {
        set({ error: response.error || 'Failed to lookup book' });
        return null;
      }
    } catch (error) {
      set({ error: 'Failed to lookup book' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
})); 