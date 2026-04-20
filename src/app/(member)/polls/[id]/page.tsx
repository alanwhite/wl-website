import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPollManagerRoles, canManagePolls, canAccessPoll } from "@/lib/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PollVoteForm } from "@/components/polls/poll-vote-form";
import { PollResults } from "@/components/polls/poll-results";
import { ClosePollButton } from "@/components/polls/close-poll-button";
import { DeletePollButton } from "@/components/polls/delete-poll-button";

export const dynamic = "force-dynamic";

export default async function PollDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const { id } = await params;

  const poll = await prisma.poll.findUnique({
    where: { id },
    include: {
      options: {
        orderBy: { sortOrder: "asc" },
        include: {
          votes: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      },
      votes: true,
      creator: { select: { name: true } },
    },
  });

  if (!poll) notFound();

  const managerRoles = await getPollManagerRoles();
  const isManager = canManagePolls(session.user, managerRoles);

  if (!isManager && !canAccessPoll(session.user, poll)) {
    redirect("/polls");
  }

  const isClosed = !!poll.closedAt;
  const userVoteOptionIds = poll.votes
    .filter((v) => v.userId === session.user.id)
    .map((v) => v.optionId);
  const totalVotes = poll.votes.length;

  const optionResults = poll.options.map((option) => ({
    id: option.id,
    text: option.text,
    count: option.votes.length,
    voters: poll.isAnonymous
      ? []
      : option.votes.map((v) => ({ id: v.user.id, name: v.user.name })),
  }));

  const maxVotesLabel = poll.maxVotes === 0 ? "Unlimited" : poll.maxVotes === 1 ? null : `Up to ${poll.maxVotes}`;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle>{poll.title}</CardTitle>
              <CardDescription>
                Created by {poll.creator?.name ?? "Unknown"} on{" "}
                {poll.createdAt.toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="flex shrink-0 gap-1">
              {poll.isAnonymous && <Badge variant="outline">Anonymous</Badge>}
              {maxVotesLabel && <Badge variant="outline">{maxVotesLabel}</Badge>}
              <Badge variant={isClosed ? "secondary" : "default"}>
                {isClosed ? "Closed" : "Open"}
              </Badge>
            </div>
          </div>
          {poll.description && (
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
              {poll.description}
            </p>
          )}
          {(poll.targetRoleSlugs.length > 0 || poll.targetMinTierLevel != null) && (
            <p className="mt-1 text-xs text-muted-foreground">
              Restricted to:
              {poll.targetRoleSlugs.length > 0 && ` roles: ${poll.targetRoleSlugs.join(", ")}`}
              {poll.targetRoleSlugs.length > 0 && poll.targetMinTierLevel != null && " | "}
              {poll.targetMinTierLevel != null && ` tier level ${poll.targetMinTierLevel}+`}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {!isClosed && (
            <PollVoteForm
              pollId={poll.id}
              options={poll.options.map((o) => ({ id: o.id, text: o.text }))}
              currentVoteOptionIds={userVoteOptionIds}
              maxVotes={poll.maxVotes}
              isClosed={false}
            />
          )}

          {(isClosed || (!poll.isAnonymous && totalVotes > 0)) && (
            <>
              <hr />
              <h3 className="text-sm font-semibold">Results</h3>
              <PollResults
                options={optionResults}
                totalVotes={totalVotes}
                isAnonymous={poll.isAnonymous}
                isClosed={isClosed}
                userVoteOptionId={userVoteOptionIds[0] ?? null}
              />
            </>
          )}

          {!isClosed && poll.isAnonymous && (
            <>
              <hr />
              <PollResults
                options={optionResults}
                totalVotes={totalVotes}
                isAnonymous={true}
                isClosed={false}
                userVoteOptionId={userVoteOptionIds[0] ?? null}
              />
            </>
          )}

          {isManager && (
            <>
              <hr />
              <div className="flex gap-3">
                {!isClosed && <ClosePollButton pollId={poll.id} />}
                <DeletePollButton pollId={poll.id} pollTitle={poll.title} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
