import apiClient from "./client"

export interface Organization {
  id: number
  name: string
  slug: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OrganizationMembership {
  organization_id: number
  organization_name: string
  organization_slug: string
  role: "owner" | "admin" | "operator" | "viewer"
  status: string
}

export interface OrganizationMember {
  user_id: number
  email: string
  full_name: string | null
  role: "owner" | "admin" | "operator" | "viewer"
  status: string
}

export interface CreateOrganizationRequest {
  name: string
  slug: string
}

export interface CreateInviteRequest {
  role: "admin" | "operator" | "viewer"
  expires_in_seconds?: number
}

export interface Invite {
  id: number
  role: string
  token: string
  expires_at: string
  used_at: string | null
  created_at: string
}

export interface EnrollmentToken {
  id: number
  organization_id: number
  token: string
  expires_at: string
  max_uses: number
  used_count: number
  used_at: string | null
  created_at: string
}

export interface CreateEnrollmentTokenRequest {
  expires_in_seconds?: number
  max_uses?: number
}

export const organizationsApi = {
  list: () => apiClient.get<Organization[]>("/organizations"),

  getMemberships: () => apiClient.get<OrganizationMembership[]>("/organizations/memberships"),

  create: (data: CreateOrganizationRequest) =>
    apiClient.post<Organization>("/organizations", data),

  getMembers: (orgId: number) =>
    apiClient.get<OrganizationMember[]>(`/organizations/${orgId}/members`),

  updateMemberRole: (orgId: number, userId: number, role: string) =>
    apiClient.patch<OrganizationMember>(`/organizations/${orgId}/members/${userId}`, { role }),

  removeMember: (orgId: number, userId: number) =>
    apiClient.delete<{ status: string }>(`/organizations/${orgId}/members/${userId}`),

  createInvite: (orgId: number, data: CreateInviteRequest) =>
    apiClient.post<Invite>(`/organizations/${orgId}/invites`, data),

  getInvites: (orgId: number) =>
    apiClient.get<Invite[]>(`/organizations/${orgId}/invites`),

  revokeInvite: (orgId: number, inviteId: number) =>
    apiClient.delete<{ status: string }>(`/organizations/${orgId}/invites/${inviteId}`),

  acceptInvite: (token: string) =>
    apiClient.post<{ status: string }>("/organizations/invites/accept", { token }),

  createEnrollmentToken: (orgId: number, data?: CreateEnrollmentTokenRequest) =>
    apiClient.post<EnrollmentToken>(`/organizations/${orgId}/enrollment-tokens`, data || {}),

  getEnrollmentTokens: (orgId: number) =>
    apiClient.get<EnrollmentToken[]>(`/organizations/${orgId}/enrollment-tokens`),

  revokeEnrollmentToken: (orgId: number, tokenId: number) =>
    apiClient.delete<{ status: string }>(`/organizations/${orgId}/enrollment-tokens/${tokenId}`),
}