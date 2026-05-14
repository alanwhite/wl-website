"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addGroupMember, removeGroupMember, setGroupRsvp, updateMemberData } from "@/lib/actions/groups";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import type { RegistrationField } from "@/lib/config";
import { isFieldVisible } from "@/lib/registration-fields";

// Field name surfaced inline as a checkbox on the Add row and each member row,
// rather than as a select in the choices section. Keeps the choices form focused
// on meal/preferences while the age-band marker drives conditional visibility.
const CHILD_FIELD = "isChild";

interface MemberData {
  id: string;
  name: string;
  userId: string | null;
  data: Record<string, string>;
}

interface GroupInfo {
  id: string;
  name: string;
  description: string | null;
  rsvpStatus: string;
  groupMembers: MemberData[];
}

interface GroupHubProps {
  group: GroupInfo;
  groupLabel: string;
  confirmLabel: string;
  memberFields: RegistrationField[];
  currentUserId: string;
  locked?: boolean;
}

export function GroupHub({ group, groupLabel, confirmLabel, memberFields, currentUserId, locked = false }: GroupHubProps) {
  const [newName, setNewName] = useState("");
  const [newIsChild, setNewIsChild] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const hasChildField = memberFields.some((f) => f.name === CHILD_FIELD);
  const renderableFields = (m: MemberData) =>
    visibleFieldsFor(m).filter((f) => f.name !== CHILD_FIELD);

  function visibleFieldsFor(member: MemberData): RegistrationField[] {
    return memberFields.filter((f) => isFieldVisible(f, member.data));
  }

  function isMemberComplete(member: MemberData): boolean {
    return visibleFieldsFor(member).every((f) => {
      if (!f.required) return true;
      const val = member.data[f.name];
      return val !== undefined && val !== "";
    });
  }

  const incompleteCount = group.groupMembers.filter((m) => !isMemberComplete(m)).length;

  async function handleRsvp(status: "attending" | "declined") {
    setLoading(true);
    try {
      await setGroupRsvp(group.id, status);
      toast.success(status === "attending" ? "Great, see you there!" : "Sorry you can't make it");
      router.refresh();
    } catch {
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const initialData = hasChildField
        ? { [CHILD_FIELD]: newIsChild ? "Yes" : "No" }
        : undefined;
      await addGroupMember(group.id, newName, initialData);
      setNewName("");
      setNewIsChild(false);
      toast.success("Added");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleChild(memberId: string, isChild: boolean) {
    try {
      await updateMemberData(memberId, { [CHILD_FIELD]: isChild ? "Yes" : "No" });
      router.refresh();
    } catch {
      toast.error("Failed to save");
    }
  }

  async function handleRemove(id: string, name: string) {
    if (!confirm(`Remove ${name}?`)) return;
    try {
      await removeGroupMember(id);
      toast.success("Member removed");
      router.refresh();
    } catch {
      toast.error("Failed to remove");
    }
  }

  async function handleFieldChange(memberId: string, fieldName: string, value: string) {
    try {
      await updateMemberData(memberId, { [fieldName]: value });
      router.refresh();
    } catch {
      toast.error("Failed to save");
    }
  }

  // Pending — show RSVP choice
  if (group.rsvpStatus === "pending") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{group.name}</CardTitle>
          {group.description && (
            <p className="text-sm text-muted-foreground">{group.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Will you be joining us?</p>
          <div className="flex gap-3">
            <Button onClick={() => handleRsvp("attending")} disabled={loading} className="flex-1">
              <Check className="mr-2 h-4 w-4" />
              {confirmLabel || "We'll be there"}
            </Button>
            <Button onClick={() => handleRsvp("declined")} disabled={loading} variant="outline" className="flex-1">
              <X className="mr-2 h-4 w-4" />
              Sorry, can&apos;t make it
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Declined
  if (group.rsvpStatus === "declined") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{group.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You&apos;ve let us know you can&apos;t make it. Changed your mind?
          </p>
          <Button onClick={() => handleRsvp("attending")} disabled={loading} variant="outline">
            <Check className="mr-2 h-4 w-4" />
            Actually, we&apos;ll be there!
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Attending — show household + meal choices
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{group.name}</CardTitle>
              {group.description && (
                <p className="text-sm text-muted-foreground">{group.description}</p>
              )}
            </div>
            <Badge className="bg-emerald-600"><Check className="mr-1 h-3 w-3" /> Attending</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Everyone listed is attending. Add or remove people as needed.
          </p>

          {/* Member list */}
          <div className="space-y-2">
            {group.groupMembers.map((m) => {
              const isCurrentUser = m.userId === currentUserId;
              const isChild = m.data[CHILD_FIELD] === "Yes";
              return (
                <div key={m.id} className="flex flex-wrap items-center gap-2 rounded border px-3 py-2">
                  <span className="text-sm font-medium">
                    {m.name}{isCurrentUser && <span className="text-muted-foreground"> (You)</span>}
                  </span>
                  {isMemberComplete(m) ? (
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : memberFields.some((f) => f.required) ? (
                    <Badge variant="outline" className="text-xs">Needs choices</Badge>
                  ) : null}
                  {hasChildField && !locked && (
                    <label className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border"
                        checked={isChild}
                        onChange={(e) => handleToggleChild(m.id, e.target.checked)}
                      />
                      Child
                    </label>
                  )}
                  {!isCurrentUser && !locked && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={hasChildField ? "h-7 text-xs text-destructive hover:text-destructive" : "ml-auto h-7 text-xs text-destructive hover:text-destructive"}
                      onClick={() => handleRemove(m.id, m.name)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add member */}
          {!locked && (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Add a person"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="min-w-0 flex-1"
              />
              {hasChildField && (
                <label className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border"
                    checked={newIsChild}
                    onChange={(e) => setNewIsChild(e.target.checked)}
                  />
                  Child
                </label>
              )}
              <Button onClick={handleAdd} disabled={loading} size="sm">
                Add
              </Button>
            </div>
          )}

          {locked && (
            <p className="text-sm text-muted-foreground italic">Choices have been locked and can no longer be changed.</p>
          )}

          {/* Change RSVP */}
          {!locked && (
            <div className="border-t pt-3">
              <Button
                onClick={() => handleRsvp("declined")}
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
              >
                Can&apos;t make it after all?
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meal choices */}
      {memberFields.some((f) => f.name !== CHILD_FIELD) && group.groupMembers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Choices</CardTitle>
              {incompleteCount > 0 && (
                <Badge variant="destructive">{incompleteCount} needed</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.groupMembers.map((m, idx) => (
              <div key={m.id}>
                {idx > 0 && <div className="mb-4 border-t" />}
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-medium">
                    {m.name}{m.userId === currentUserId && <span className="text-muted-foreground"> (You)</span>}
                  </h3>
                  {isMemberComplete(m) && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                </div>
                <div className="space-y-3">
                  {renderableFields(m).map((field) => {
                    const currentValue = m.data[field.name] ?? "";

                    if (field.type === "select" && field.options) {
                      return (
                        <div key={field.name} className="space-y-1">
                          <label className="text-sm font-medium">{field.label}</label>
                          <Select
                            value={currentValue}
                            onValueChange={(val) => handleFieldChange(m.id, field.name, val)}
                            disabled={locked}
                          >
                            <SelectTrigger className="w-full min-w-0 [&>span]:min-w-0 [&>span]:truncate">
                              <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options.map((opt) => (
                                <SelectItem key={opt} value={opt} className="whitespace-normal">{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    }

                    return (
                      <div key={field.name} className="space-y-1">
                        <label className="text-sm font-medium">{field.label}</label>
                        <Input
                          defaultValue={currentValue}
                          placeholder={field.placeholder}
                          disabled={locked}
                          onBlur={(e) => {
                            if (e.target.value !== currentValue) {
                              handleFieldChange(m.id, field.name, e.target.value);
                            }
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
