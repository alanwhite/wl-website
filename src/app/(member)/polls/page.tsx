import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPollManagerRoles, canManagePolls, canAccessPoll } from "@/lib/config";
import { PollCard } from "@/components/polls/poll-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PollsPage() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const managerRoles = await getPollManagerRoles();
  const isManager = canManagePolls(session.user, managerRoles);

  const polls = await prisma.poll.findMany({
    include: {
      _count: { select: { votes: true } },
      votes: {
        where: { userId: session.user.id },
        select: { id: true },
      },
    },
    orderBy: [{ closedAt: "asc" }, { createdAt: "desc" }],
  });

  // Filter polls the user can access, then split open/closed
  const accessiblePolls = isManager
    ? polls // managers see all polls
    : polls.filter((p) => canAccessPoll(session.user, p));
  const openPolls = accessiblePolls.filter((p) => !p.closedAt);
  const closedPolls = accessiblePolls.filter((p) => p.closedAt);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Polls</h1>
        {isManager && (
          <Link href="/polls/create">
            <Button>Create Poll</Button>
          </Link>
        )}
      </div>

      {accessiblePolls.length === 0 && (
        <p className="text-muted-foreground">No polls yet.</p>
      )}

      {openPolls.length > 0 && (
        <div className="space-y-3">
          {openPolls.map((poll) => (
            <PollCard
              key={poll.id}
              id={poll.id}
              title={poll.title}
              isAnonymous={poll.isAnonymous}
              isClosed={false}
              totalVotes={poll._count.votes}
              hasVoted={poll.votes.length > 0}
              createdAt={poll.createdAt}
            />
          ))}
        </div>
      )}

      {closedPolls.length > 0 && (
        <>
          {openPolls.length > 0 && <hr className="my-6" />}
          <h2 className="mb-3 text-lg font-semibold text-muted-foreground">Closed</h2>
          <div className="space-y-3">
            {closedPolls.map((poll) => (
              <PollCard
                key={poll.id}
                id={poll.id}
                title={poll.title}
                isAnonymous={poll.isAnonymous}
                isClosed={true}
                totalVotes={poll._count.votes}
                hasVoted={poll.votes.length > 0}
                createdAt={poll.createdAt}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
