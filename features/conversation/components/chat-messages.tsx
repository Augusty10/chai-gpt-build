"use client";

import { isTextUIPart, type UIMessage } from "ai";
import type { ChatStatus } from "ai";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";
import { ToolInvocationComponent } from "@/components/ai-elements/tool-invocation";

/** Extracts plain text from a `UIMessage` by joining all text parts. */
function getMessageText(message: UIMessage) {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");
}

type ChatMessagesProps = {
  messages: UIMessage[];
  status: ChatStatus;
};

/**
 * Renders the conversation message list with markdown responses and a loading indicator.
 */
export function ChatMessages({ messages, status }: ChatMessagesProps) {
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
    </Conversation>
  );
}
