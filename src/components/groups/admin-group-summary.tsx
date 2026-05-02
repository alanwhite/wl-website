"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
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
  confirmedAt: string | null;
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

  const confirmedGroups = groups.filter((g) => g.confirmedAt);
  const unconfirmedGroups = groups.filter((g) => !g.confirmedAt);
  const totalMembers = confirmedGroups.reduce((sum, g) => sum + g.groupMembers.length, 0);
  const completeMembers = confirmedGroups.reduce(
    (sum, g) => sum + g.groupMembers.filter((m) => isMemberComplete(m)).length,
    0,
  );
  const incompleteMembers = totalMembers - completeMembers;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{groups.length}</div>
            <div className="text-sm text-muted-foreground">{groupLabel}s</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{confirmedGroups.length}</div>
            <div className="text-sm text-muted-foreground">Responded</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{totalMembers}</div>
            <div className="text-sm text-muted-foreground">Attending</div>
          </CardContent>
        </Card>
        {requiredFields.length > 0 && (
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{incompleteMembers > 0 ? incompleteMembers : "All done"}</div>
              <div className="text-sm text-muted-foreground">{incompleteMembers > 0 ? "Choices outstanding" : "Choices complete"}</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Not responded */}
      {unconfirmedGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Not Yet Responded ({unconfirmedGroups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unconfirmedGroups.map((g) => (
                <Badge key={g.id} variant="outline">{g.name}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmed groups with expandable details */}
      {confirmedGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Check className="h-4 w-4" />
              Responded ({confirmedGroups.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {confirmedGroups.map((g) => {
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
                        {total} {total === 1 ? "person" : "people"}
                      </span>
                    </div>
                    {requiredFields.length > 0 && (
                      allComplete ? (
                        <Badge className="bg-green-600"><Check className="mr-1 h-3 w-3" />{complete}/{total}</Badge>
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
                              <Check className="h-3 w-3 text-green-600" />
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
    </div>
  );
}
