import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

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
import AdminSettingsPage from '@/pages/AdminSettingsPage';
import AdminBackupPage from '@/pages/AdminBackupPage';
import CommunityActivityPage from '@/pages/CommunityActivityPage';
import PublicLibraryPage from '@/pages/PublicLibraryPage';
import MonthWrapupPage from '@/pages/MonthWrapupPage';
import ImportPage from '@/pages/ImportPage';
import NotFoundPage from '@/pages/NotFoundPage';

const App: React.FC = () => {

  return (
    <BrowserRouter future={{ v7_startTransition: true }}>
      <div className="min-h-screen bg-base-200">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
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
            <Route path="admin/settings" element={<AdminSettingsPage />} />
            <Route path="admin/backup" element={<AdminBackupPage />} />
            
            {/* Community */}
            <Route path="community/activity" element={<CommunityActivityPage />} />
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
  );
};

export default App;
