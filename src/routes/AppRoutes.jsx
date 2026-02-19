// src/AppRoutes.jsx
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import ProtectedRoute from '../components/ProtectedRoute'
import ErrorBoundary from '../components/ErrorBoundary'
import RoleRedirect from "../components/RoleRedirect"


// Lazy loading untuk performance optimization
const Login = lazy(() => import('../pages/sidebar/Login'))
const Profile = lazy(() => import('../pages/sidebar/Profile'))
const Layout = lazy(() => import('../components/layout/Layout'));// Import Layout

// Admin pages
const Upload = lazy(() => import('../pages/sidebar/Upload'))
const FilesPage = lazy(() => import('../pages/sidebar/FilesPage'))
const Users = lazy(() => import('../pages/sidebar/Users'))
const AnnouncementManagement = lazy(() => import('../pages/sidebar/AnnouncementManagement'))

// User pages
const MyFiles = lazy(() => import('../pages/sidebar/MyFiles'))

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
)

export default function AppRoutes() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* PUBLIC */}
          <Route path="/login" element={<Login />} />

          {/* PROTECTED WITH LAYOUT */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Outlet />
                </Layout>
              </ProtectedRoute>
            }
          >
            {/* ROOT REDIRECT */}
            <Route index element={<RoleRedirect />} />

            {/* ADMIN */}
            <Route
              path="files"
              element={
                <ProtectedRoute adminOnly>
                  <FilesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="users"
              element={
                <ProtectedRoute adminOnly>
                  <Users />
                </ProtectedRoute>
              }
            />

            <Route
              path="upload"
              element={
                <ProtectedRoute adminOnly>
                  <Upload />
                </ProtectedRoute>
              }
            />

            <Route
              path="announcements"
              element={
                <ProtectedRoute adminOnly>
                  <AnnouncementManagement />
                </ProtectedRoute>
              }
            />

            {/* USER */}
            <Route path="my-files" element={<MyFiles />} />
            <Route path="profile" element={<Profile />} />


          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

window.addEventListener("error", (e) => {
  document.body.innerHTML += `<pre style="color:red">${e.message}</pre>`
})
