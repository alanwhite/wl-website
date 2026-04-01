import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{name}</CardTitle>
        </CardHeader>
        <CardContent>
          {description && (
            <p className="mb-2 text-sm text-muted-foreground">{description}</p>
          )}
          <Badge variant="secondary">
            {documentCount} document{documentCount !== 1 ? "s" : ""}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
