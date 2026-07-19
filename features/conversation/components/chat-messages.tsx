"use client";

import { isTextUIPart, type UIMessage } from "ai";
import type { ChatStatus } from "ai";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitForkIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";
import { ToolInvocationComponent } from "@/components/ai-elements/tool-invocation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { createBranch } from "@/features/conversation/actions/conversation-actions";

/** Extracts plain text from a `UIMessage` by joining all text parts. */
function getMessageText(message: UIMessage) {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");
}

type ChatMessagesProps = {
  conversationId: string;
  conversationTitle?: string;
  messages: UIMessage[];
  status: ChatStatus;
};

/**
 * Renders the conversation message list with markdown responses and a loading indicator.
 */
export function ChatMessages({
  conversationId,
  conversationTitle,
  messages,
  status,
}: ChatMessagesProps) {
  const router = useRouter();
  const [branchingMessageId, setBranchingMessageId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState("");
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchingMessageId) return;

    setIsCreatingBranch(true);
    try {
      const newConvo = await createBranch(
        conversationId,
        branchingMessageId,
        branchName
      );
      toast.success("Branch created successfully!");
      setBranchingMessageId(null);
      router.push(`/c/${newConvo.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create branch");
    } finally {
      setIsCreatingBranch(false);
    }
  };

  const isWaiting =
    status === "submitted" && messages.at(-1)?.role === "user";

  return (
    <Conversation>
      <ConversationContent className="py-8">
        {messages.map((message) => (
          <Message key={message.id} from={message.role}>
            <MessageContent>
              {message.role === "user" ? (
                <MessageResponse>{getMessageText(message)}</MessageResponse>
              ) : (
                <div className="flex flex-col gap-2 w-full">
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return (
                        <MessageResponse key={`${message.id}-part-${index}`}>
                          {part.text}
                        </MessageResponse>
                      );
                    }
                    if (part.type === "tool-call") {
                      const toolCall = part as unknown as {
                        toolCallId: string;
                        toolName: string;
                        args: any;
                      };
                      const hasResult = message.parts.some(
                        (p) => p.type === "tool-result" && (p as any).toolCallId === toolCall.toolCallId
                      );
                      if (!hasResult) {
                        return (
                          <ToolInvocationComponent
                            key={toolCall.toolCallId}
                            state="call"
                            toolCallId={toolCall.toolCallId}
                            toolName={toolCall.toolName}
                            args={toolCall.args}
                          />
                        );
                      }
                    }
                    if (part.type === "tool-result") {
                      const toolResult = part as unknown as {
                        toolCallId: string;
                        toolName: string;
                        args: any;
                        result: any;
                      };
                      return (
                        <ToolInvocationComponent
                          key={toolResult.toolCallId}
                          state="result"
                          toolCallId={toolResult.toolCallId}
                          toolName={toolResult.toolName}
                          args={toolResult.args}
                          result={toolResult.result}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              )}
            </MessageContent>
            
            <div className="mt-1 flex items-center px-1">
              <MessageActions className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <MessageAction
                  tooltip="Fork this conversation into a new branch"
                  onClick={() => {
                    setBranchingMessageId(message.id);
                    setBranchName(`${conversationTitle || "Chat"} (Branch)`);
                  }}
                >
                  <GitForkIcon className="size-3.5 text-muted-foreground hover:text-foreground" />
                </MessageAction>
              </MessageActions>
            </div>
          </Message>
        ))}

        {isWaiting ? (
          <Message from="assistant">
            <MessageContent>
              <Loader />
            </MessageContent>
          </Message>
        ) : null}
      </ConversationContent>

      {/* Branch creation modal */}
      <Dialog
        open={branchingMessageId !== null}
        onOpenChange={(open) => {
          if (!open) setBranchingMessageId(null);
        }}
      >
        <DialogContent>
          <form onSubmit={handleCreateBranch} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Create Conversation Branch</DialogTitle>
              <DialogDescription>
                Fork this conversation into a new branch starting from this message. Sibling branches share the original history prior to the split.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              <label htmlFor="branch-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Branch Name
              </label>
              <Input
                id="branch-name"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Branch name..."
                required
                autoFocus
              />
            </div>

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" disabled={isCreatingBranch} />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={isCreatingBranch || !branchName.trim()}>
                {isCreatingBranch ? "Creating..." : "Create Branch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Conversation>
  );
}
