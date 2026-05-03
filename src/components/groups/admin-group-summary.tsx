"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, AlertCircle, X, ChevronDown, ChevronRight } from "lucide-react";
import type { RegistrationField } from "@/lib/config";

interface MemberData {
  id: string;
  name: string;
  data: Record<string, string>;
}

interface GroupSummaryData {
  id: string;
  name: string;
  description: string | null;
  rsvpStatus: string;
  groupMembers: MemberData[];
}

interface AdminGroupSummaryProps {
  groups: GroupSummaryData[];
  groupLabel: string;
  memberFields: RegistrationField[];
}

export function AdminGroupSummary({ groups, groupLabel, memberFields }: AdminGroupSummaryProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const requiredFields = memberFields.filter((f) => f.required);

  function isMemberComplete(member: MemberData): boolean {
    if (requiredFields.length === 0) return true;
    return requiredFields.every((f) => {
      const val = member.data[f.name];
      return val !== undefined && val !== "";
    });
  }

  function toggleExpand(groupId: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  const attending = groups.filter((g) => g.rsvpStatus === "attending");
  const declined = groups.filter((g) => g.rsvpStatus === "declined");
  const pending = groups.filter((g) => g.rsvpStatus === "pending");
  const totalAttending = attending.reduce((sum, g) => sum + g.groupMembers.length, 0);
  const completeMembers = attending.reduce(
    (sum, g) => sum + g.groupMembers.filter((m) => isMemberComplete(m)).length,
    0,
  );
  const incompleteMembers = totalAttending - completeMembers;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{attending.length}</div>
            <div className="text-sm text-muted-foreground">Attending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{totalAttending}</div>
            <div className="text-sm text-muted-foreground">Total guests</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{declined.length}</div>
            <div className="text-sm text-muted-foreground">Declined</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{pending.length}</div>
            <div className="text-sm text-muted-foreground">Awaiting RSVP</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Awaiting RSVP ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {pending.map((g) => (
                <Badge key={g.id} variant="outline">{g.name}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attending with expandable details */}
      {attending.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Check className="h-4 w-4" />
                Attending ({attending.length})
              </CardTitle>
              {requiredFields.length > 0 && incompleteMembers > 0 && (
                <Badge variant="destructive">{incompleteMembers} choices outstanding</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {attending.map((g) => {
              const complete = g.groupMembers.filter((m) => isMemberComplete(m)).length;
              const total = g.groupMembers.length;
              const allComplete = complete === total;
              const isExpanded = expandedGroups.has(g.id);

              return (
                <div key={g.id} className="rounded border">
                  <button
                    onClick={() => toggleExpand(g.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="text-sm font-medium">{g.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {total} {total === 1 ? "guest" : "guests"}
                      </span>
                    </div>
                    {requiredFields.length > 0 && (
                      allComplete ? (
                        <Badge className="bg-emerald-600"><Check className="mr-1 h-3 w-3" />{complete}/{total}</Badge>
                      ) : (
                        <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" />{complete}/{total}</Badge>
                      )
                    )}
                  </button>
                  {isExpanded && (
                    <div className="border-t px-3 py-2 space-y-2">
                      {g.groupMembers.map((m) => (
                        <div key={m.id} className="rounded bg-muted/30 px-3 py-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{m.name}</span>
                            {isMemberComplete(m) ? (
                              <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-destructive" />
                            )}
                          </div>
                          {memberFields.length > 0 && (
                            <div className="grid gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                              {memberFields.map((f) => (
                                <div key={f.name}>
                                  <span className="font-medium">{f.label}:</span>{" "}
                                  {m.data[f.name] || <span className="italic">Not set</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Declined */}
      {declined.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <X className="h-4 w-4" />
              Declined ({declined.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {declined.map((g) => (
                <Badge key={g.id} variant="secondary">{g.name}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
