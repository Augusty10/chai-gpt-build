"use client";

import * as React from "react";
import {
  GlobeIcon,
  SearchIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ToolInvocationProps = {
  state: "call" | "result";
  toolCallId: string;
  toolName: string;
  args: any;
  result?: any;
};

type SearchResultItem = {
  title: string;
  link: string;
  snippet: string;
};

/**
 * Extracts the clean domain name (e.g. "nextjs.org") from a URL.
 */
function getDomain(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    return url.hostname.replace("www.", "");
  } catch {
    return urlStr;
  }
}

/**
 * Component to render execution state and results of AI tool calls in the message stream.
 */
export function ToolInvocationComponent({
  state,
  toolName,
  args,
  result,
}: ToolInvocationProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  if (toolName !== "webSearch") {
    // Fallback for other potential tools
    return (
      <div className="my-2 rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
        Tool Call: {toolName} ({state === "call" ? "running" : "completed"})
      </div>
    );
  }

  const query = args.query as string;

  // 1. Loading State (Executing Search)
  if (state === "call") {
    return (
      <div className="my-3 flex w-fit items-center gap-3 rounded-2xl border border-border/60 bg-muted/15 px-4 py-2.5 shadow-sm animate-pulse">
        <Spinner className="size-4 text-primary" />
        <GlobeIcon className="size-4 animate-spin text-muted-foreground [animation-duration:8s]" />
        <span className="text-sm font-medium text-muted-foreground">
          Searching the web for <span className="text-foreground font-semibold italic">"{query}"</span>...
        </span>
      </div>
    );
  }

  // 2. Completed State
  const searchResults = (result as SearchResultItem[]) || [];
  const hasResults = searchResults.length > 0;

  return (
    <div className="my-3 w-full max-w-2xl">
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <CollapsibleTrigger
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-2.5 text-left text-sm font-medium transition-all hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            isOpen ? "rounded-b-none border-b-0" : ""
          )}
        >
          <div className="flex items-center gap-2.5 truncate">
            {hasResults ? (
              <CheckCircle2Icon className="size-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangleIcon className="size-4 text-amber-500 shrink-0" />
            )}
            <span className="truncate text-muted-foreground">
              Searched the web for: <span className="font-semibold text-foreground italic">"{query}"</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={hasResults ? "secondary" : "outline"} className={cn("text-xs font-semibold px-2 py-0.5", hasResults ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none" : "text-amber-600 dark:text-amber-400")}>
              {hasResults ? `${searchResults.length} results` : "No results"}
            </Badge>
            {isOpen ? (
              <ChevronUpIcon className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDownIcon className="size-4 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="rounded-b-2xl border border-t-0 border-border/70 bg-muted/10 p-4 transition-all">
          {!hasResults ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <AlertTriangleIcon className="size-4 text-amber-500 shrink-0" />
              <span>The search query returned no matches or experienced an error. The assistant will answer using its pre-trained knowledge base.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Search Matches</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {searchResults.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col justify-between rounded-xl border border-border/40 bg-card p-3 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/10 hover:shadow-sm"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <GlobeIcon className="size-3 text-muted-foreground/60 shrink-0" />
                        <span className="truncate max-w-[150px]">{getDomain(item.link)}</span>
                      </div>
                      <h4 className="line-clamp-2 text-[13px] font-semibold text-foreground group-hover:text-primary group-hover:underline leading-tight transition-colors">
                        {item.title}
                      </h4>
                      <p className="line-clamp-3 text-xs text-muted-foreground leading-normal font-normal">
                        {item.snippet}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-end text-[10px] text-muted-foreground font-medium group-hover:text-primary transition-colors">
                      <span>Visit site</span>
                      <ExternalLinkIcon className="ml-1 size-2.5" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
