import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";

interface CategoryCardProps {
  slug: string;
  name: string;
  description: string | null;
  documentCount: number;
  childCount?: number;
}

export function CategoryCard({ slug, name, description, documentCount, childCount }: CategoryCardProps) {
  return (
    <Link href={`/documents/${slug}`}>
      <Card className="transition-colors hover:border-primary/50">
        <CardContent className="py-4">
          <div className="flex items-center gap-2">
            {(childCount ?? 0) > 0 && <FolderOpen className="h-4 w-4 text-muted-foreground" />}
            <p className="font-semibold">{name}</p>
          </div>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
          <div className="mt-2 flex gap-2">
            <Badge variant="secondary">
              {documentCount} document{documentCount !== 1 ? "s" : ""}
            </Badge>
            {(childCount ?? 0) > 0 && (
              <Badge variant="outline">
                {childCount} sub-folder{childCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
