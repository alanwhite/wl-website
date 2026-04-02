import { prisma } from "@/lib/prisma";
import { isNewsletterEnabled } from "@/lib/emailoctopus";
import { NewsletterCompose } from "@/components/admin/newsletter-compose";
import { listCampaigns } from "@/lib/actions/newsletter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminNewslettersPage() {
  if (!isNewsletterEnabled()) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Newsletters</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>Newsletter integration is not configured.</p>
            <p className="mt-2 text-sm">
              Set <code>EMAILOCTOPUS_API_KEY</code> and <code>EMAILOCTOPUS_LIST_ID</code> in your environment to enable newsletters.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subscriberCount = await prisma.user.count({
    where: { newsletterOptIn: true, status: "APPROVED" },
  });

  const campaigns = await listCampaigns();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Newsletters</h1>

      <div className="flex gap-4">
        <Card className="flex-1">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">{subscriberCount}</p>
            <p className="text-sm text-muted-foreground">Subscribers</p>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">{campaigns.length}</p>
            <p className="text-sm text-muted-foreground">Sent</p>
          </CardContent>
        </Card>
      </div>

      <NewsletterCompose />

      {campaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sent Newsletters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {campaigns.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <p className="text-sm font-medium">{c.name ?? c.subject ?? "Untitled"}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <Badge variant="secondary">{c.status ?? "sent"}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
