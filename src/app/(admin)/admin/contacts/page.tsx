import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ContactActions } from "@/components/admin/contact-actions";

export const dynamic = "force-dynamic";

export default async function AdminContactsPage() {
  const contacts = await prisma.contactSubmission.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Contact Submissions</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No contact submissions
                </TableCell>
              </TableRow>
            )}
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">{contact.name}</TableCell>
                <TableCell>{contact.email}</TableCell>
                <TableCell>{contact.subject ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={contact.read ? "secondary" : "default"}>
                    {contact.read ? "Read" : "New"}
                  </Badge>
                </TableCell>
                <TableCell>{format(contact.createdAt, "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <ContactActions contact={contact} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
