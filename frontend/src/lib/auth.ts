import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import type { User } from './types'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function useCurrentUser(): User | null {
  const { data } = useMe()
  return data ?? null
}

export function isAdmin(user: User | null | undefined): boolean {
  return user?.role === 'SUPER_ADMIN'
}
