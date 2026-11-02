import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, LogOut, Menu, Plus, X } from 'lucide-react'
import { api } from '../lib/api'
import { isAdmin, useCurrentUser } from '../lib/auth'
import { Avatar } from './ui'

const WORKSPACE_NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/tracker', label: 'Content tracker', end: false },
  { to: '/calendar', label: 'Calendar', end: false },
]

const ADMIN_NAV = [
  { to: '/backups', label: 'Excel backups', end: false },
  { to: '/users', label: 'Team', end: false },
]

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link to="/" onClick={onClick} className="inline-flex items-baseline gap-2.5">
      <span className="text-sm font-semibold tracking-[0.2em] text-paper uppercase">
        Specanciens
      </span>
      <span className="hidden font-sans text-[11px] text-muted sm:inline">Social Desk</span>
    </Link>
  )
}

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useCurrentUser()
  const admin = isAdmin(user)

  const navItems = [...WORKSPACE_NAV, ...(admin ? ADMIN_NAV : [])]

  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      queryClient.setQueryData(['me'], null)
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <div className="min-h-screen bg-ink">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-rule bg-ink">
        <div className="page-wrap flex h-20 items-center gap-10">
          <Brand />

          <nav className="hidden h-full items-center gap-8 lg:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex h-full items-center border-b-2 font-sans text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'border-paper text-paper'
                      : 'border-transparent text-muted hover:text-paper'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            <Link to="/posts/new" className="btn btn-primary btn-sm hidden sm:inline-flex">
              <Plus className="h-4 w-4" />
              New post
            </Link>
            <Link
              to="/profile"
              className="hidden items-center gap-2.5 border border-rule-strong px-2.5 py-2 transition-colors hover:border-paper md:flex"
              title="Your profile"
            >
              <Avatar name={user?.fullName ?? 'User'} size="xs" />
              <span className="max-w-24 truncate font-sans text-[12px] font-medium text-graphite">
                {user?.fullName.split(' ')[0] ?? 'Profile'}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="hidden h-10 w-10 items-center justify-center border border-rule-strong text-muted transition-colors hover:border-paper hover:text-paper disabled:opacity-40 md:flex"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <Link
              to="/posts/new"
              className="flex h-10 w-10 items-center justify-center border border-paper bg-paper text-ink sm:hidden"
              aria-label="New post"
            >
              <Plus className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center border border-rule-strong text-paper transition-colors hover:border-paper lg:hidden"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="min-h-[calc(100vh-12rem)]">
        <div
          key={location.pathname}
          className="page-wrap animate-rise-in py-12 sm:py-16 lg:py-20"
        >
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-rule">
        <div className="page-wrap flex flex-wrap items-center justify-between gap-3 py-10">
          <p className="meta">Specanciens Social Desk</p>
          <p className="meta">St. Peter&apos;s College, Hyderabad</p>
          <p className="meta">{new Date().getFullYear()} / Private workspace</p>
        </div>
      </footer>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink lg:hidden">
          <div className="flex h-20 shrink-0 items-center justify-between border-b border-rule px-5 sm:px-8">
            <Brand onClick={() => setMobileOpen(false)} />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex h-10 w-10 items-center justify-center border border-rule-strong text-paper"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-5 py-10 sm:px-8" aria-label="Mobile navigation">
            <p className="eyebrow">Navigation</p>
            <div className="mt-5">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `group flex items-center justify-between border-b border-rule py-5 transition-colors ${
                      isActive ? 'text-paper' : 'text-graphite hover:text-paper'
                    }`
                  }
                >
                  <span className="font-sans text-2xl font-medium tracking-[-0.02em]">
                    {item.label}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </NavLink>
              ))}
            </div>
          </nav>

          <div className="shrink-0 border-t border-rule p-5 sm:p-8">
            <Link
              to="/posts/new"
              onClick={() => setMobileOpen(false)}
              className="btn btn-primary w-full"
            >
              <Plus className="h-4 w-4" />
              New post
            </Link>
            <div className="mt-5 flex items-center justify-between gap-4">
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className="flex min-w-0 items-center gap-3"
              >
                <Avatar name={user?.fullName ?? 'User'} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-paper">
                    {user?.fullName ?? 'Signed in'}
                  </span>
                  <span className="meta">{admin ? 'Super Admin' : 'Team member'}</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="flex h-10 items-center gap-2 border border-rule-strong px-3.5 font-sans text-[12px] font-medium text-muted transition-colors hover:border-paper hover:text-paper"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
