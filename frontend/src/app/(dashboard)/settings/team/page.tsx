"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { organizationsApi } from "@/lib/api/organizations"
import { LoadingSpinner } from "@/components/shared/loading-spinner"
import { EmptyState } from "@/components/shared/empty-state"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Users, Copy, Trash2, Plus, Mail } from "lucide-react"
import { useUIStore } from "@/stores/uiStore"

export default function TeamPage() {
  const { currentOrganizationId } = useUIStore()
  const queryClient = useQueryClient()

  const { data: memberships } = useQuery({
    queryKey: ["organization-memberships"],
    queryFn: organizationsApi.getMemberships,
  })

  const currentOrg = memberships?.[0]

  const { data: members, isLoading } = useQuery({
    queryKey: ["organization-members", currentOrg?.organization_id],
    queryFn: () => organizationsApi.getMembers(currentOrg!.organization_id),
    enabled: !!currentOrg?.organization_id,
  })

  const { data: invites } = useQuery({
    queryKey: ["organization-invites", currentOrg?.organization_id],
    queryFn: () => organizationsApi.getInvites(currentOrg!.organization_id!),
    enabled: !!currentOrg?.organization_id,
  })

  const createInvite = useMutation({
    mutationFn: (role: "admin" | "operator" | "viewer") =>
      organizationsApi.createInvite(currentOrg!.organization_id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-invites"] })
    },
  })

  if (isLoading) {
    return <LoadingSpinner message="Cargando equipo..." />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Equipo</h1>
        <p className="text-muted-foreground">Gestiona los miembros de tu organización</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Miembros
          </CardTitle>
          <CardDescription>Miembros activos de la organización</CardDescription>
        </CardHeader>
        <CardContent>
          {!members || members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sin miembros"
              description="Invita a otros usuarios a tu organización"
            />
          ) : (
            <div className="divide-y">
              {members.map((member) => (
                <div key={member.user_id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{member.full_name || member.email}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                  <Badge variant="outline">{member.role}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invitar miembros
          </CardTitle>
          <CardDescription>Envía invitaciones para unirte a la organización</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => createInvite.mutate("admin")}
              disabled={createInvite.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              Admin
            </Button>
            <Button
              variant="outline"
              onClick={() => createInvite.mutate("operator")}
              disabled={createInvite.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              Operator
            </Button>
            <Button
              variant="outline"
              onClick={() => createInvite.mutate("viewer")}
              disabled={createInvite.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              Viewer
            </Button>
          </div>

          {invites && invites.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Invitaciones pendientes</p>
              {invites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{invite.role}</p>
                    <p className="text-xs text-muted-foreground">
                      Expira: {new Date(invite.expires_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}