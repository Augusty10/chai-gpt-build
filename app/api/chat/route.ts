import { loadChatMessages, saveChatMessages } from "@/features/ai/actions/chat-store";
import { getChatModel } from "@/features/ai/utils/model";
import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { convertToModelMessages, createIdGenerator, createUIMessageStream, createUIMessageStreamResponse, streamText, toUIMessageStream, tool, isStepCount, type UIMessage } from "ai";
import { z } from "zod";
import { searchWeb } from "@/lib/search";
/**
 * POST /api/chat — Streams an AI assistant reply for a conversation.
 *
 * Validates auth and ownership, persists the user message, then streams the
 * assistant response via the AI SDK. Final messages are saved when the stream ends.
 */
export async function POST(req: Request) {
    await auth.protect();

    const { message, id }: { message: UIMessage, id: string } = await req.json();

    if (!message || !id) {
        return new Response("Missing message or conversation id", { status: 400 });
    }

    const user = await requireUser();

    const conversation = await prisma.conversation.findFirst({
        where: {
            id,
            userId: user.id
        }
    });

    if (!conversation) {
        return new Response("Conversation not found", { status: 404 });
    }

    const previousMessages = await loadChatMessages(id);

    const alreadySaved = previousMessages.some(
        (storedMessage)=>storedMessage.id === message.id
    )

    const messages = alreadySaved ? previousMessages : [...previousMessages, message];

    if(!alreadySaved){
        await saveChatMessages(id, [message]);
    }

    const result =  streamText({
        model: getChatModel(conversation.model),
        system: conversation.systemPrompt ?? "You are ChaiGpt, a helpful assistant. Use the webSearch tool when the user asks about current events, up-to-date topics, or queries requiring real-time web search. Always cite links or reference sources from search results to support your answer.",
        messages: await convertToModelMessages(messages),
        stopWhen: [isStepCount(5)],
        tools: {
            webSearch: tool({
                description: "Search the web for real-time information or up-to-date facts on current events, news, or technical questions.",
                inputSchema: z.object({
                    query: z.string().describe("The search query to look up on the web."),
                }),
                execute: async ({ query }: { query: string }) => {
                    try {
                        const results = await searchWeb(query);
                        return results;
                    } catch (error) {
                        console.error("webSearch tool execution failed:", error);
                        return [];
                    }
                },
            }),
        },
    });

    result.consumeStream();

    return createUIMessageStreamResponse({
        stream:toUIMessageStream({
           stream:result.stream,
           originalMessages:messages,
           generateMessageId:createIdGenerator({prefix:"msg" , size:16}),
           onEnd:async({messages:finalMessages})=>{
            try {
                await saveChatMessages(id , finalMessages , {updateTitle:false})
            } catch (error) {
                console.error(error);
            }
           }
        })
    })

}