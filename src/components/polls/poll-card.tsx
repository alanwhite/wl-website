import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PollCardProps {
  id: string;
  title: string;
  isAnonymous: boolean;
  isClosed: boolean;
  totalVotes: number;
  hasVoted: boolean;
  createdAt: Date;
}

export function PollCard({ id, title, isAnonymous, isClosed, totalVotes, hasVoted, createdAt }: PollCardProps) {
  return (
    <Link href={`/polls/${id}`}>
      <Card className="transition-colors hover:border-primary/50">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{title}</CardTitle>
            <div className="flex shrink-0 gap-1">
              {isAnonymous && <Badge variant="outline">Anonymous</Badge>}
              <Badge variant={isClosed ? "secondary" : "default"}>
                {isClosed ? "Closed" : "Open"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
            {hasVoted && <Badge variant="outline" className="text-xs">Voted</Badge>}
            <span className="ml-auto">{createdAt.toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
