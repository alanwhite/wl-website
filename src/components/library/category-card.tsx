import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface CategoryCardProps {
  slug: string;
  name: string;
  description: string | null;
  documentCount: number;
}

export function CategoryCard({ slug, name, description, documentCount }: CategoryCardProps) {
  return (
    <Link href={`/documents/${slug}`}>
      <Card className="transition-colors hover:border-primary/50">
        <CardContent className="py-4">
          <p className="font-semibold">{name}</p>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
          <Badge variant="secondary" className="mt-2">
            {documentCount} document{documentCount !== 1 ? "s" : ""}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
