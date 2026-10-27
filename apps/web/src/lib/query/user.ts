import {
  GetMembersRoute,
  GetUserRouteV2,
  GetUserSelfBongVersionRouteV2,
  GetUserSelfRouteV2,
  GoodBongVersion,
  GoodMemberData,
  GoodUserDataV2,
  GoodUserSelfDataV2,
} from '@rctf/types'
import { createQuery, queryOptions } from '@tanstack/svelte-query'
import { apiRequest, isAuthenticated } from '$lib/api'
import { unwrapData } from '$lib/query/core'
import { queryKeys } from '$lib/query/keys'

export const userSelfQueryOptions = queryOptions({
  queryKey: queryKeys.userSelf,
  queryFn: async () => {
    if (!isAuthenticated()) {
      return null
    }
    const response = await apiRequest(GetUserSelfRouteV2)
    if (response.kind === GoodUserSelfDataV2.kind) {
      return response.data
    }
    return null
  },
  staleTime: 1000 * 60 * 5,
  // Fallback only; the bong version poll refetches as soon as anything changes.
  refetchInterval: 2 * 60 * 1000,
})

export function useCurrentUser() {
  return createQuery(() => userSelfQueryOptions)
}

export function useBongVersion(
  userId: () => string | undefined,
  /** Polling interval in ms, or `false` to stop; re-read after every poll. */
  interval: () => number | false
) {
  return createQuery(() => ({
    queryKey: queryKeys.bongVersion(userId()),
    queryFn: async () => {
      const response = await apiRequest(GetUserSelfBongVersionRouteV2)
      return unwrapData(response, GoodBongVersion).version
    },
    enabled: userId() !== undefined,
    // Re-check immediately when the tab becomes visible again.
    staleTime: 0,
    refetchInterval: () => interval(),
  }))
}

export function userByIdQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.userById(id),
    queryFn: async () => {
      const response = await apiRequest(GetUserRouteV2, { id })
      return unwrapData(response, GoodUserDataV2)
    },
  })
}

export function useUserById(id: () => string) {
  return createQuery(() => userByIdQueryOptions(id()))
}

export function membersQueryOptions(enabled: boolean) {
  return queryOptions({
    queryKey: queryKeys.members,
    queryFn: async () => {
      const response = await apiRequest(GetMembersRoute)
      return unwrapData(response, GoodMemberData)
    },
    enabled,
  })
}

export function useMembers(enabled: () => boolean) {
  return createQuery(() => membersQueryOptions(enabled()))
}
