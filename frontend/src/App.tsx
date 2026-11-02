import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import AppShell from './components/AppShell'
import { Spinner } from './components/ui'
import { useCurrentUser, useMe } from './lib/auth'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TrackerPage from './pages/TrackerPage'
import CalendarPage from './pages/CalendarPage'
import PostFormPage from './pages/PostFormPage'
import PostDetailPage from './pages/PostDetailPage'
import ReviewPage from './pages/ReviewPage'
import BackupsPage from './pages/BackupsPage'
import UsersPage from './pages/UsersPage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink text-paper">
      <span className="flex h-16 w-16 items-center justify-center border border-paper font-serif text-3xl">
        S
      </span>
      <div className="flex items-center gap-3">
        <Spinner />
        <span className="meta">Opening Social Desk…</span>
      </div>
    </div>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { data, isLoading } = useMe()
  const location = useLocation()

  if (isLoading) return <Splash />
  if (!data) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  return <>{children}</>
}

function AdminOnly({ children }: { children: ReactNode }) {
  const user = useCurrentUser()
  if (!user) return null
  if (user.role !== 'SUPER_ADMIN') return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="tracker" element={<TrackerPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="posts/new" element={<PostFormPage />} />
        <Route path="posts/:id" element={<PostDetailPage />} />
        <Route path="posts/:id/edit" element={<PostFormPage />} />
        <Route path="review/:id" element={<ReviewPage />} />
        <Route
          path="backups"
          element={
            <AdminOnly>
              <BackupsPage />
            </AdminOnly>
          }
        />
        <Route
          path="users"
          element={
            <AdminOnly>
              <UsersPage />
            </AdminOnly>
          }
        />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
