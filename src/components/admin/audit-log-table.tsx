"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: Date;
}

interface AuditLogTableProps {
  logs: AuditLog[];
  currentPage: number;
  totalPages: number;
  actionFilter: string;
}

export function AuditLogTable({ logs, currentPage, totalPages, actionFilter }: AuditLogTableProps) {
  const [filter, setFilter] = useState(actionFilter);
  const router = useRouter();

  function handleFilter() {
    const params = new URLSearchParams();
    if (filter) params.set("action", filter);
    router.push(`/admin/audit?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Filter by action..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
          onKeyDown={(e) => e.key === "Enter" && handleFilter()}
        />
        <Button variant="outline" onClick={handleFilter}>
          Filter
        </Button>
        {actionFilter && (
          <Button
            variant="ghost"
            onClick={() => {
              setFilter("");
              router.push("/admin/audit");
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-sm">{log.userName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.targetType && (
                      <span>
                        {log.targetType}
                        {log.targetId && ` #${log.targetId.slice(0, 8)}`}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                    {Object.keys(log.details).length > 0
                      ? JSON.stringify(log.details)
                      : ""}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => router.push(`/admin/audit?page=${currentPage - 1}${actionFilter ? `&action=${actionFilter}` : ""}`)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => router.push(`/admin/audit?page=${currentPage + 1}${actionFilter ? `&action=${actionFilter}` : ""}`)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
