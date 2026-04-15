"use client"

import { useState, useEffect, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, Users, Plus, Loader2, UserPlus, Pencil, Crown, UserMinus, Trash2 } from "lucide-react"
import { supabaseBrowser } from "@/lib/supabase/browser"
import Link from "next/link"
import Navbar from "@/components/navbar"
import type { ResearchGroup } from "@/types"

export default function GroupsPage() {
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [groups, setGroups] = useState<ResearchGroup[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [member1Name, setMember1Name] = useState("")
  const [member1Email, setMember1Email] = useState("")
  const [member2Name, setMember2Name] = useState("")
  const [member2Email, setMember2Email] = useState("")
  const [member3Name, setMember3Name] = useState("")
  const [member3Email, setMember3Email] = useState("")
  const [leaderRole, setLeaderRole] = useState<"member1" | "member2" | "member3">("member1")
  const [isCreating, setIsCreating] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [memberInputs, setMemberInputs] = useState<Record<string, string>>({})
  const [renameInputs, setRenameInputs] = useState<Record<string, { name: string; description: string }>>({})
  const [addingMemberGroupId, setAddingMemberGroupId] = useState<string | null>(null)
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null)
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null)
  const [leavingGroupId, setLeavingGroupId] = useState<string | null>(null)
  const [removingMemberKey, setRemovingMemberKey] = useState<string | null>(null)
  const [transferringMemberKey, setTransferringMemberKey] = useState<string | null>(null)
  const router = useRouter()

  const loadGroups = async () => {
    setGroupsLoading(true)
    try {
      const response = await fetch("/api/groups", { cache: "no-store" })
      const json = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(json?.error || "Failed to load groups")
      }

      const nextGroups = Array.isArray(json?.groups) ? json.groups : []
      setGroups(nextGroups)
      setRenameInputs((previous) => {
        const nextDrafts: Record<string, { name: string; description: string }> = {}

        nextGroups.forEach((group) => {
          nextDrafts[group.id] = previous[group.id] || {
            name: group.name,
            description: group.description || "",
          }
        })

        return nextDrafts
      })
    } finally {
      setGroupsLoading(false)
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = supabaseBrowser()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      setCurrentUserId(user.id)

      try {
        await loadGroups()
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load groups"
        setFeedback({ type: "error", text: message })
      }

      setLoading(false)
    }

    checkAuth()
  }, [router])

  const handleCreateGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)

    if (!groupName.trim()) {
      setFeedback({ type: "error", text: "Group name is required" })
      return
    }

    const members = [
      { name: member1Name.trim(), email: member1Email.trim(), role: leaderRole === "member1" ? "leader" : "member" },
      { name: member2Name.trim(), email: member2Email.trim(), role: leaderRole === "member2" ? "leader" : "member" },
      { name: member3Name.trim(), email: member3Email.trim(), role: leaderRole === "member3" ? "leader" : "member" },
    ].filter(m => m.name && m.email)

    if (members.length === 0) {
      setFeedback({ type: "error", text: "At least one member name and email is required" })
      return
    }

    const leaderCount = members.filter(m => m.role === "leader").length
    if (leaderCount !== 1) {
      setFeedback({ type: "error", text: "Please select exactly one leader" })
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDescription.trim(),
          members,
        }),
      })

      const json = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(json?.error || "Failed to create group")
      }

      setGroupName("")
      setGroupDescription("")
      setMember1Name("")
      setMember1Email("")
      setMember2Name("")
      setMember2Email("")
      setMember3Name("")
      setMember3Email("")
      setLeaderRole("member1")
      setIsCreateOpen(false)
      await loadGroups()
      setFeedback({ type: "success", text: "Research group created successfully" })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create group"
      setFeedback({ type: "error", text: message })
    } finally {
      setIsCreating(false)
    }
  }

  const handleAddMember = async (groupId: string) => {
    const email = (memberInputs[groupId] || "").trim()
    if (!email) {
      setFeedback({ type: "error", text: "Enter a member email first" })
      return
    }

    setAddingMemberGroupId(groupId)
    setFeedback(null)

    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const json = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(json?.error || "Failed to add member")
      }

      setMemberInputs((previous) => ({
        ...previous,
        [groupId]: "",
      }))

      await loadGroups()
      const inviteStatus = json?.invite?.status === "pending" ? "pending invite created" : "added to group"
      setFeedback({ type: "success", text: `${email} ${inviteStatus}` })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add member"
      setFeedback({ type: "error", text: message })
    } finally {
      setAddingMemberGroupId(null)
    }
  }

  const handleRenameGroup = async (groupId: string) => {
    const draft = renameInputs[groupId]

    if (!draft?.name?.trim()) {
      setFeedback({ type: "error", text: "Group name is required" })
      return
    }

    setRenamingGroupId(groupId)
    setFeedback(null)

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: draft.name.trim(),
          description: draft.description.trim(),
        }),
      })

      const json = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(json?.error || "Failed to rename group")
      }

      await loadGroups()
      setFeedback({ type: "success", text: "Group details updated" })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to rename group"
      setFeedback({ type: "error", text: message })
    } finally {
      setRenamingGroupId(null)
    }
  }

  const handleTransferLeader = async (groupId: string, memberId: string, displayName: string) => {
    const key = `${groupId}:${memberId}`
    setTransferringMemberKey(key)
    setFeedback(null)

    try {
      const response = await fetch(`/api/groups/${groupId}/leader`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profileId: memberId }),
      })

      const json = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(json?.error || "Failed to transfer leader role")
      }

      await loadGroups()
      setFeedback({ type: "success", text: `Leadership transferred to ${displayName}` })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to transfer leader role"
      setFeedback({ type: "error", text: message })
    } finally {
      setTransferringMemberKey(null)
    }
  }

  const handleRemoveMember = async (groupId: string, memberId: string, displayName: string) => {
    const key = `${groupId}:${memberId}`
    setRemovingMemberKey(key)
    setFeedback(null)

    try {
      const response = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
        method: "DELETE",
      })

      const json = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(json?.error || "Failed to remove member")
      }

      await loadGroups()
      setFeedback({ type: "success", text: `${displayName} removed from group` })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove member"
      setFeedback({ type: "error", text: message })
    } finally {
      setRemovingMemberKey(null)
    }
  }

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    const shouldDelete = window.confirm(`Delete group "${groupName}"? This will remove all members from the group.`)
    if (!shouldDelete) return

    setDeletingGroupId(groupId)
    setFeedback(null)

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
      })

      const json = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(json?.error || "Failed to delete group")
      }

      await loadGroups()
      setFeedback({ type: "success", text: `Group "${groupName}" deleted` })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete group"
      setFeedback({ type: "error", text: message })
    } finally {
      setDeletingGroupId(null)
    }
  }

  const handleLeaveGroup = async (groupId: string) => {
    if (!currentUserId) {
      setFeedback({ type: "error", text: "Unable to identify your profile" })
      return
    }

    const shouldLeave = window.confirm("Leave this group?")
    if (!shouldLeave) return

    setLeavingGroupId(groupId)
    setFeedback(null)

    try {
      const response = await fetch(`/api/groups/${groupId}/members/${currentUserId}`, {
        method: "DELETE",
      })

      const json = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(json?.error || "Failed to leave group")
      }

      await loadGroups()
      setFeedback({ type: "success", text: "You left the group" })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to leave group"
      setFeedback({ type: "error", text: message })
    } finally {
      setLeavingGroupId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Workspace
          </Link>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Research Groups</h1>
              <p className="text-muted-foreground mt-1">Coordinate with your capstone collaboration team</p>
            </div>
            <Button
              className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 gap-2"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Create Research Group
            </Button>
          </div>

          {feedback ? (
            <div
              className={`mb-6 rounded-md border px-4 py-3 text-sm ${
                feedback.type === "success"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-red-500/40 bg-red-500/10 text-red-200"
              }`}
            >
              {feedback.text}
            </div>
          ) : null}

          {groupsLoading ? (
            <Card className="bg-card border-border">
              <CardContent className="py-16 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : groups.length === 0 ? (
            <Card className="bg-card border-border">
              <CardHeader className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Users className="w-10 h-10 text-purple-400" />
                </div>
                <CardTitle className="text-foreground text-xl">No Research Groups Yet</CardTitle>
                <CardDescription className="text-muted-foreground max-w-md mx-auto">
                  Create your first research group to start organizing your leader/member capstone collaboration.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-12">
                <Button
                  variant="outline"
                  className="bg-card border-border text-foreground hover:bg-accent"
                  onClick={() => router.push("/student/dashboard")}
                >
                  Return to Workspace
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => {
                const isLeader = group.current_user_role === "leader"
                const orderedMembers = [...group.members].sort((first, second) => {
                  if (first.member_role === second.member_role) return 0
                  return first.member_role === "leader" ? -1 : 1
                })
                const pendingInvites = group.pending_invites || []

                let memberIndex = 0

                return (
                  <Card key={group.id} className="bg-card border-border">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-foreground text-xl">{group.name}</CardTitle>
                          <CardDescription className="text-muted-foreground mt-1">
                            {group.description || "No description added yet"}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={isLeader ? "default" : "secondary"}>
                            {isLeader ? "Leader" : "Member"}
                          </Badge>
                          {!isLeader ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => void handleLeaveGroup(group.id)}
                              disabled={leavingGroupId === group.id}
                            >
                              {leavingGroupId === group.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <UserMinus className="w-3 h-3" />
                              )}
                              Leave Group
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {isLeader ? (
                        <div className="rounded-md border border-border p-3 space-y-3">
                          <p className="text-sm font-medium text-foreground">Group details</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input
                              value={renameInputs[group.id]?.name || ""}
                              onChange={(event) =>
                                setRenameInputs((previous) => ({
                                  ...previous,
                                  [group.id]: {
                                    name: event.target.value,
                                    description: previous[group.id]?.description || "",
                                  },
                                }))
                              }
                              placeholder="Group name"
                            />
                            <Input
                              value={renameInputs[group.id]?.description || ""}
                              onChange={(event) =>
                                setRenameInputs((previous) => ({
                                  ...previous,
                                  [group.id]: {
                                    name: previous[group.id]?.name || group.name,
                                    description: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Description (optional)"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() => void handleRenameGroup(group.id)}
                              disabled={renamingGroupId === group.id || deletingGroupId === group.id}
                              variant="outline"
                              className="gap-2"
                            >
                              {renamingGroupId === group.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Pencil className="w-4 h-4" />
                              )}
                              Rename Group
                            </Button>
                            <Button
                              onClick={() => void handleDeleteGroup(group.id, group.name)}
                              disabled={deletingGroupId === group.id || renamingGroupId === group.id}
                              variant="destructive"
                              className="gap-2"
                            >
                              {deletingGroupId === group.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                              Delete Group
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Members ({group.members.length})</p>
                        <div className="space-y-2">
                          {orderedMembers.map((member) => {
                            const roleLabel =
                              member.member_role === "leader" ? "Leader" : `Member ${++memberIndex}`
                            const actionKey = `${group.id}:${member.id}`
                            const isRemoving = removingMemberKey === actionKey
                            const isTransferring = transferringMemberKey === actionKey

                            return (
                              <div
                                key={member.id}
                                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                              >
                                <div>
                                  <p className="text-sm font-medium text-foreground">{member.display_name}</p>
                                  <p className="text-xs text-muted-foreground">{member.email}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{roleLabel}</Badge>
                                  {isLeader && member.member_role !== "leader" ? (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        className="gap-1"
                                        onClick={() =>
                                          void handleTransferLeader(group.id, member.id, member.display_name)
                                        }
                                        disabled={isTransferring || isRemoving}
                                      >
                                        {isTransferring ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Crown className="w-3 h-3" />
                                        )}
                                        Transfer Leader
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="gap-1"
                                        onClick={() => void handleRemoveMember(group.id, member.id, member.display_name)}
                                        disabled={isRemoving || isTransferring}
                                      >
                                        {isRemoving ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <UserMinus className="w-3 h-3" />
                                        )}
                                        Remove
                                      </Button>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {pendingInvites.length ? (
                        <div className="rounded-md border border-dashed border-border p-3">
                          <p className="text-sm font-medium text-foreground mb-2">Pending invites</p>
                          <div className="flex flex-wrap gap-2">
                            {pendingInvites.map((invite) => (
                              <Badge key={invite.id} variant="secondary">
                                {invite.email}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {isLeader ? (
                        <div className="border-t border-border pt-4">
                          <p className="text-sm font-medium text-foreground mb-2">Add member by email</p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              placeholder="member@email.com"
                              value={memberInputs[group.id] || ""}
                              onChange={(event) =>
                                setMemberInputs((previous) => ({
                                  ...previous,
                                  [group.id]: event.target.value,
                                }))
                              }
                            />
                            <Button
                              onClick={() => void handleAddMember(group.id)}
                              disabled={addingMemberGroupId === group.id}
                              className="gap-2"
                            >
                              {addingMemberGroupId === group.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <UserPlus className="w-4 h-4" />
                              )}
                              Add Member
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Research Group</DialogTitle>
            <DialogDescription>
              Set up your group with 3 members and assign roles.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateGroup} className="space-y-4" onReset={() => {
            setGroupName("")
            setGroupDescription("")
            setMember1Name("")
            setMember1Email("")
            setMember2Name("")
            setMember2Email("")
            setMember3Name("")
            setMember3Email("")
            setLeaderRole("member1")
          }}>
            <div className="space-y-2">
              <label className="text-sm text-foreground font-medium">Group name *</label>
              <Input
                placeholder="Example: AI Vision Team"
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                maxLength={120}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-foreground font-medium">Description</label>
              <Textarea
                placeholder="What is this group working on?"
                value={groupDescription}
                onChange={(event) => setGroupDescription(event.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="space-y-3 rounded-md bg-accent/30 p-3">
              <p className="text-sm font-medium text-foreground">Group Members (pick 1 as leader)</p>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Member 1</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-1">
                      <Input
                        placeholder="Full name"
                        value={member1Name}
                        onChange={(event) => setMember1Name(event.target.value)}
                        size={1}
                      />
                      <Input
                        placeholder="email@example.com"
                        value={member1Email}
                        onChange={(event) => setMember1Email(event.target.value)}
                        size={1}
                      />
                    </div>
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="leader"
                        value="member1"
                        checked={leaderRole === "member1"}
                        onChange={() => setLeaderRole("member1")}
                        className="rounded-full"
                      />
                      <span className="text-xs text-muted-foreground">Leader</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Member 2</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-1">
                      <Input
                        placeholder="Full name"
                        value={member2Name}
                        onChange={(event) => setMember2Name(event.target.value)}
                        size={1}
                      />
                      <Input
                        placeholder="email@example.com"
                        value={member2Email}
                        onChange={(event) => setMember2Email(event.target.value)}
                        size={1}
                      />
                    </div>
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="leader"
                        value="member2"
                        checked={leaderRole === "member2"}
                        onChange={() => setLeaderRole("member2")}
                        className="rounded-full"
                      />
                      <span className="text-xs text-muted-foreground">Leader</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Member 3</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-1">
                      <Input
                        placeholder="Full name"
                        value={member3Name}
                        onChange={(event) => setMember3Name(event.target.value)}
                        size={1}
                      />
                      <Input
                        placeholder="email@example.com"
                        value={member3Email}
                        onChange={(event) => setMember3Email(event.target.value)}
                        size={1}
                      />
                    </div>
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="leader"
                        value="member3"
                        checked={leaderRole === "member3"}
                        onChange={() => setLeaderRole("member3")}
                        className="rounded-full"
                      />
                      <span className="text-xs text-muted-foreground">Leader</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating} className="gap-2">
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Group
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
