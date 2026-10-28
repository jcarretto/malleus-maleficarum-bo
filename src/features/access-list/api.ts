import { apiRequest } from '@/services/client'
import type { AccessList, AccessListEntry } from '@/services/types'

/**
 * Endpoints of /v1/admin/access-list (API-102): the emails allowed to open the
 * player app during pre-release. The API keeps them in a Cloudflare Zero Trust list.
 */
export const accessListApi = {
  list(signal?: AbortSignal): Promise<AccessList> {
    return apiRequest<AccessList>('/v1/admin/access-list', signal ? { signal } : {})
  },

  add(email: string): Promise<AccessListEntry> {
    return apiRequest<AccessListEntry>('/v1/admin/access-list', {
      method: 'POST',
      body: { email },
    })
  },

  remove(email: string): Promise<undefined> {
    return apiRequest<undefined>(`/v1/admin/access-list/${encodeURIComponent(email)}`, {
      method: 'DELETE',
    })
  },
}

export const accessListQueryKey = ['access-list'] as const
