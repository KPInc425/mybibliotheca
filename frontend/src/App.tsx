import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import ThemeProvider from '@/components/ThemeProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import LibraryPage from '@/pages/LibraryPage';
import MassEditPage from '@/pages/MassEditPage';
import AddBookPage from '@/pages/AddBookPage';
import BookDetailPage from '@/pages/BookDetailPage';
import BookEditPage from '@/pages/BookEditPage';
import BookLogPage from '@/pages/BookLogPage';
import SearchPage from '@/pages/SearchPage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import AdminUsersPage from '@/pages/AdminUsersPage';
import AdminCreateUserPage from '@/pages/AdminCreateUserPage';
import AdminSettingsPage from '@/pages/AdminSettingsPage';
import AdminBackupPage from '@/pages/AdminBackupPage';
import AdminInvitesPage from '@/pages/AdminInvitesPage';
import UserInvitesPage from '@/pages/UserInvitesPage';
import CommunityActivityPage from '@/pages/CommunityActivityPage';
import ActiveReadersPage from '@/pages/ActiveReadersPage';
import BooksThisMonthPage from '@/pages/BooksThisMonthPage';
import CurrentlyReadingPage from '@/pages/CurrentlyReadingPage';
import RecentActivityPage from '@/pages/RecentActivityPage';
import UserProfilePage from '@/pages/UserProfilePage';
import PublicLibraryPage from '@/pages/PublicLibraryPage';
import MonthWrapupPage from '@/pages/MonthWrapupPage';
import ImportPage from '@/pages/ImportPage';
import NotFoundPage from '@/pages/NotFoundPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';

const App: React.FC = () => {

  return (
    <ThemeProvider>
      <BrowserRouter future={{ v7_startTransition: true }}>
        <div className="min-h-screen bg-base-200">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            
            {/* Protected Routes */}
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              {/* Dashboard */}
              <Route index element={<DashboardPage />} />
              
              {/* Library Management */}
              <Route path="library" element={<LibraryPage />} />
              <Route path="library/mass-edit" element={<MassEditPage />} />
              
              {/* Book Management */}
              <Route path="add-book" element={<AddBookPage />} />
              <Route path="book/:uid" element={<BookDetailPage />} />
              <Route path="book/:uid/edit" element={<BookEditPage />} />
              <Route path="book/:uid/log" element={<BookLogPage />} />
              
              {/* Search */}
              <Route path="search" element={<SearchPage />} />
              
              {/* User Management */}
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
              
              {/* Admin Routes */}
              <Route path="admin" element={<AdminDashboardPage />} />
              <Route path="admin/users" element={<AdminUsersPage />} />
              <Route path="admin/users/create" element={<AdminCreateUserPage />} />
              <Route path="admin/settings" element={<AdminSettingsPage />} />
              <Route path="admin/backup" element={<AdminBackupPage />} />
              <Route path="admin/invites" element={<AdminInvitesPage />} />
              
              {/* User Invites */}
              <Route path="invites" element={<UserInvitesPage />} />
              
              {/* Community */}
              <Route path="community/activity" element={<CommunityActivityPage />} />
              <Route path="community/active-readers" element={<ActiveReadersPage />} />
              <Route path="community/books-this-month" element={<BooksThisMonthPage />} />
              <Route path="community/currently-reading" element={<CurrentlyReadingPage />} />
              <Route path="community/recent-activity" element={<RecentActivityPage />} />
              <Route path="user/:userId" element={<UserProfilePage />} />
              <Route path="public-library" element={<PublicLibraryPage />} />
              
              {/* Reports & Analytics */}
              <Route path="reports/month-wrapup" element={<MonthWrapupPage />} />
              
              {/* Import/Export */}
              <Route path="import" element={<ImportPage />} />
              
              {/* Catch all */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
