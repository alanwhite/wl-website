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
import { addGroupMember, removeGroupMember, confirmGroup, updateMemberData } from "@/lib/actions/groups";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import type { RegistrationField } from "@/lib/config";

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
  confirmedAt: string | null;
  groupMembers: MemberData[];
}

interface GroupHubProps {
  group: GroupInfo;
  groupLabel: string;
  confirmLabel: string;
  memberFields: RegistrationField[];
}

export function GroupHub({ group, groupLabel, confirmLabel, memberFields }: GroupHubProps) {
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const requiredFields = memberFields.filter((f) => f.required);

  function isMemberComplete(member: MemberData): boolean {
    if (requiredFields.length === 0) return true;
    return requiredFields.every((f) => {
      const val = member.data[f.name];
      return val !== undefined && val !== "";
    });
  }

  const incompleteCount = group.groupMembers.filter((m) => !isMemberComplete(m)).length;

  async function handleAdd() {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await addGroupMember(group.id, newName);
      setNewName("");
      toast.success("Member added");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id: string, name: string) {
    if (!confirm(`Remove ${name}? They will no longer be attending.`)) return;
    try {
      await removeGroupMember(id);
      toast.success("Member removed");
      router.refresh();
    } catch {
      toast.error("Failed to remove");
    }
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      await confirmGroup(group.id);
      toast.success("Attendance confirmed");
      router.refresh();
    } catch {
      toast.error("Failed to confirm");
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      {/* Household / Attendance Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{group.name}</CardTitle>
              {group.description && (
                <p className="text-sm text-muted-foreground">{group.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {group.confirmedAt ? (
                <Badge className="bg-green-600"><Check className="mr-1 h-3 w-3" /> Confirmed</Badge>
              ) : (
                <Badge variant="outline">Not yet confirmed</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Everyone listed below is attending. Add or remove people as needed, then confirm your attendance.
          </p>

          {/* Member list */}
          <div className="space-y-2">
            {group.groupMembers.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded border px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{m.name}</span>
                  {isMemberComplete(m) ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : requiredFields.length > 0 ? (
                    <Badge variant="outline" className="text-xs">Needs choices</Badge>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => handleRemove(m.id, m.name)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          {/* Add member */}
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Add a person"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={loading} size="sm">
              Add
            </Button>
          </div>

          {/* Confirm button */}
          {!group.confirmedAt && group.groupMembers.length > 0 && (
            <Button onClick={handleConfirm} disabled={loading} className="w-full">
              {loading ? "Confirming..." : confirmLabel}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Member Fields Card (meal choices etc.) */}
      {memberFields.length > 0 && group.groupMembers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Choices</CardTitle>
              {incompleteCount > 0 && (
                <Badge variant="destructive">{incompleteCount} needed</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {group.groupMembers.map((m) => (
              <div key={m.id} className="space-y-3 rounded border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{m.name}</h3>
                  {isMemberComplete(m) && <Check className="h-4 w-4 text-green-600" />}
                </div>
                {memberFields.map((field) => {
                  const currentValue = m.data[field.name] ?? "";

                  if (field.type === "select" && field.options) {
                    return (
                      <div key={field.name} className="space-y-1">
                        <label className="text-sm font-medium">{field.label}</label>
                        <Select
                          value={currentValue}
                          onValueChange={(val) => handleFieldChange(m.id, field.name, val)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
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
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
