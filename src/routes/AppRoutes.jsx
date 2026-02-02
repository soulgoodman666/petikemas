import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/layout/Layout';

import Login from '../pages/sidebar/Login';
import Profile from '../pages/sidebar/Profile';

// Admin pages
import Upload from '../pages/sidebar/Upload';
import FilesPage from '../pages/sidebar/FilesPage';
import Users from '../pages/sidebar/Users';
import AnnouncementManagement from '../pages/sidebar/AnnouncementManagement';

// User pages
import MyFiles from '../pages/sidebar/MyFiles';

// Protected Route Component
function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !user.isAdmin) {
    return <Navigate to="/my-files" replace />;
  }

  return children;
}

export default function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* PUBLIC ROUTES - TANPA LAYOUT */}
      <Route path="/login" element={
        user ? <Navigate to={user.isAdmin ? "/files" : "/my-files"} replace /> : <Login />
      } />

      {/* PROTECTED ROUTES - DENGAN LAYOUT */}
      <Route element={<MainLayout />}>
        {/* ROOT REDIRECT */}
        <Route path="/" element={
          <ProtectedRoute>
            <Navigate to={user?.isAdmin ? "/files" : "/my-files"} replace />
          </ProtectedRoute>
        } />

        {/* ADMIN ONLY PAGES */}
        <Route path="/upload" element={
          <ProtectedRoute adminOnly={true}>
            <Upload />
          </ProtectedRoute>
        } />
        
        <Route path="/files" element={
          <ProtectedRoute adminOnly={true}>
            <FilesPage />
          </ProtectedRoute>
        } />
        
        <Route path="/users" element={
          <ProtectedRoute adminOnly={true}>
            <Users />
          </ProtectedRoute>
        } />
        
        <Route path="/announcements" element={
          <ProtectedRoute adminOnly={true}>
            <AnnouncementManagement />
          </ProtectedRoute>
        } />

        {/* USER PAGES - ALL AUTHENTICATED USERS */}
        <Route path="/my-files" element={
          <ProtectedRoute>
            <MyFiles />
          </ProtectedRoute>
        } />
        
        {/* PROFILE - ALL USERS */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
      </Route>

      {/* 404 - REDIRECT BASED ON AUTH */}
      <Route path="*" element={
        user ? <Navigate to={user.isAdmin ? "/files" : "/my-files"} replace /> : <Navigate to="/login" replace />
      } />
    </Routes>
  );
}