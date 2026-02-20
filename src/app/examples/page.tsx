"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EXAMPLES_INDEX } from "@/lib/examples";
import { FileText, Server, Users, Link as LinkIcon } from "lucide-react";

const FW_ICONS: Record<string, typeof FileText> = {
  claude: FileText, mcp: Server, crewai: Users, langchain: LinkIcon,
};

const FRAMEWORKS = ["all", "claude", "mcp", "crewai", "langchain"];
const COMPLEXITIES = ["all", "simple", "moderate", "complex"];

export default function ExamplesPage() {
  const [fwFilter, setFwFilter] = useState("all");
  const [cxFilter, setCxFilter] = useState("all");

  const filtered = EXAMPLES_INDEX.filter(e =>
    (fwFilter === "all" || e.framework === fwFilter) &&
    (cxFilter === "all" || e.complexity === cxFilter)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reference Library</h1>
        <p className="text-muted-foreground mt-1">
          7 built-in example skills across all frameworks — all scoring 94-100 on validation
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Framework:</span>
          {FRAMEWORKS.map(fw => (
            <Button key={fw} variant={fwFilter === fw ? "default" : "outline"} size="sm" onClick={() => setFwFilter(fw)}>
              {fw === "all" ? "All" : fw}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Complexity:</span>
          {COMPLEXITIES.map(cx => (
            <Button key={cx} variant={cxFilter === cx ? "default" : "outline"} size="sm" onClick={() => setCxFilter(cx)}>
              {cx === "all" ? "All" : cx}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((ex) => {
          const Icon = FW_ICONS[ex.framework] || FileText;
          return (
            <Link key={ex.name} href={`/examples/${ex.name}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{ex.display_name}</CardTitle>
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{ex.description}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{ex.framework}</Badge>
                    <Badge variant="outline">{ex.complexity}</Badge>
                    {ex.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No examples match the current filters.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
