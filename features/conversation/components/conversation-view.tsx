"use client";
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useQueryClient } from '@tanstack/react-query';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useChat } from "@ai-sdk/react"
import React, { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation';
import { useConversations } from '../hooks/use-conversation';
import { queryKeys } from '../utils/query-keys';
import { toast } from 'sonner';
import { ChatEmpty } from './chat-empty';
import { ChatMessages } from './chat-messages';
import { ChatComposer } from './chat-composer';
import { CheckIcon, ChevronDownIcon, GitForkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { listBranches, type ConversationBranchItem } from "@/features/conversation/actions/conversation-actions";
import { cn } from "@/lib/utils";

type ConversationViewProps = {
    conversationId: string;
    initialMessages: UIMessage[];
};

/**
 * Main chat view — header, message list (or empty state), and composer with streaming.
 */
export const ConversationView = ({ conversationId, initialMessages }: ConversationViewProps) => {

    const queryClient = useQueryClient();
    const { data: conversations } = useConversations();

    const transport = useMemo(() => new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ id, messages }) => ({
            body: {
                id, message: messages.at(-1)
            }
        })
    }), []);

    const { messages, sendMessage, status } = useChat({
        id: conversationId,
        messages: initialMessages,
        transport,
        onFinish: () => {
            void queryClient.invalidateQueries({
                queryKey: queryKeys.conversations.all,
            });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    })
    const router = useRouter();
    const title =
    conversations?.find((item) => item.id === conversationId)?.title ?? "Chat";

    const [branches, setBranches] = useState<ConversationBranchItem[]>([]);
    const [loadingBranches, setLoadingBranches] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setLoadingBranches(true);
        listBranches(conversationId)
            .then((data) => {
                if (isMounted) {
                    setBranches(data);
                }
            })
            .catch((err) => {
                console.error("Failed to load branches:", err);
            })
            .finally(() => {
                if (isMounted) {
                    setLoadingBranches(false);
                }
            });
        return () => {
            isMounted = false;
        };
    }, [conversationId]);

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col">
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
                <SidebarTrigger />
                <Separator orientation="vertical" className="mx-1 h-4" />
                
                {/* Branch switcher dropdown */}
                {branches.length > 1 ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger render={
                            <Button variant="ghost" size="sm" className="font-heading text-sm font-semibold flex items-center gap-1.5 max-w-[200px] hover:bg-muted/60 rounded-xl px-2.5 py-1">
                                <GitForkIcon className="size-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate">{title}</span>
                                <ChevronDownIcon className="size-3 text-muted-foreground shrink-0" />
                            </Button>
                        } />
                        <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
                            <DropdownMenuLabel>Conversation Branches</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                {branches.map((b) => (
                                    <DropdownMenuItem
                                        key={b.id}
                                        onClick={() => router.push(`/c/${b.id}`)}
                                        className={cn(
                                            "flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-sm transition-colors cursor-pointer",
                                            b.isActive ? "bg-accent text-accent-foreground font-semibold" : "hover:bg-muted/50"
                                        )}
                                    >
                                        <div className="flex flex-col min-w-0">
                                            <span className="truncate font-medium">{b.title}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                Active {new Date(b.lastMessageAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {b.isActive && <CheckIcon className="size-3.5 text-primary shrink-0" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <h1 className="truncate text-sm font-medium">{title}</h1>
                )}
            </header>

            {messages.length === 0 ? (
                <ChatEmpty />
            ) : (
                <ChatMessages
                    conversationId={conversationId}
                    conversationTitle={title}
                    messages={messages}
                    status={status}
                />
            )}

            <ChatComposer
                onSend={(text) => {
                    void sendMessage({ text });
                }}
                isSending={status !== "ready"}
                autoFocus
            />
        </div>
    )
}
