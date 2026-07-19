"use server";

import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

/** Shape of a conversation row returned in the sidebar list. */
export type ConversationListItem = {
    id: string;
    title: string;
    isPinned: boolean;
    isArchived: boolean;
    lastMessageAt: Date;
    createdAt: Date;
    updatedAt: Date;
};


/**
 * Verifies that a conversation exists and belongs to the given user.
 *
 * @throws {Error} When the conversation is not found or not owned by the user.
 */
async function assertOwnsConversation(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findFirst({
        where: {
            id: conversationId,
            userId
        }
    });

    if (!conversation) {
        throw new Error("Conversation not found")
    }

    return conversation
}

/**
 * Fetches a single conversation owned by the current user.
 *
 * @param conversationId - The conversation to load.
 * @throws {Error} When the conversation is not found.
 */
export async function getConversation(conversationId: string) {
    const user = await requireUser();
    return assertOwnsConversation(conversationId, user.id)
}


/**
 * Lists non-archived conversations for the current user.
 * Pinned conversations appear first, then sorted by most recent activity.
 */
export async function listConversations(): Promise<ConversationListItem[]> {
    const user = await requireUser();

    return prisma.conversation.findMany({
        where: { userId: user.id, isArchived: false },
        orderBy: [{ isPinned: "desc" }, { lastMessageAt: "desc" }],
        select: {
            id: true,
            title: true,
            isPinned: true,
            isArchived: true,
            lastMessageAt: true,
            createdAt: true,
            updatedAt: true,
        },
    })
}

/**
 * Creates a new conversation for the current user.
 *
 * @param title - Optional title; defaults to "New Chat".
 */
export async function createConversation(title = "New Chat") {
    const user = await requireUser();

    return prisma.conversation.create({
        data: {
            userId: user.id,
            title: title.trim() || "New Chat",
        },
    });
}

/**
 * Updates conversation metadata (title, pin, or archive status).
 *
 * @param conversationId - The conversation to update.
 * @param data - Fields to change; omitted fields are left unchanged.
 */
export async function updateConversation(
    conversationId: string,
    data: { title?: string; isPinned?: boolean; isArchived?: boolean }
) {
    const user = await requireUser();
    await assertOwnsConversation(conversationId, user.id);

    const conversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: {
            ...(data.title !== undefined ? { title: data.title.trim() || "New Chat" } : {}),
            ...(data.isPinned !== undefined ? { isPinned: data.isPinned } : {}),
            ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {}),
        },
    });

    revalidatePath("/");
    revalidatePath(`/c/${conversationId}`);
    return conversation;
}



/**
 * Permanently deletes a conversation owned by the current user.
 *
 * @param conversationId - The conversation to delete.
 * @returns The deleted conversation ID.
 */
export async function deleteConversation(conversationId: string) {
    const user = await requireUser();
    await assertOwnsConversation(conversationId, user.id);

    await prisma.conversation.delete({
        where: { id: conversationId },
    });

    revalidatePath("/");
    return { id: conversationId };
}

/**
 * Creates a branched conversation split off from a specific message in a parent conversation.
 * Clones all message history up to and including the target message.
 *
 * @param conversationId - The parent conversation ID.
 * @param messageId - The message ID where the branching occurs.
 * @param title - Optional title for the new branch.
 */
export async function createBranch(
    conversationId: string,
    messageId: string,
    title?: string
) {
    const user = await requireUser();
    const parent = await assertOwnsConversation(conversationId, user.id);

    // Fetch all messages in the parent conversation
    const parentMessages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
    });

    // Find the index of the message we are branching from
    const branchPointIndex = parentMessages.findIndex((msg: any) => msg.id === messageId);
    if (branchPointIndex === -1) {
        throw new Error("Branch point message not found in conversation");
    }

    // Keep messages up to and including the split message
    const messagesToClone = parentMessages.slice(0, branchPointIndex + 1);

    // Generate a default title if none is provided
    const branchTitle = title?.trim() || `${parent.title} (Branch)`;

    // Create the new branched conversation
    const branchedConversation = await prisma.conversation.create({
        data: {
            userId: user.id,
            title: branchTitle,
            parentId: conversationId,
            branchedFromMessageId: messageId,
            model: parent.model,
            systemPrompt: parent.systemPrompt,
        },
    });

    // Clone the message records
    for (const msg of messagesToClone) {
        await prisma.message.create({
            data: {
                conversationId: branchedConversation.id,
                role: msg.role,
                status: msg.status,
                content: msg.content,
                parts: msg.parts ?? undefined,
                metadata: msg.metadata ?? undefined,
                createdAt: msg.createdAt, // Preserve original timestamps for sequence consistency
            },
        });
    }

    revalidatePath("/");
    return branchedConversation;
}

/**
 * Interface representing a branch navigation item.
 */
export type ConversationBranchItem = {
    id: string;
    title: string;
    parentId: string | null;
    branchedFromMessageId: string | null;
    createdAt: Date;
    lastMessageAt: Date;
    isActive: boolean;
};

/**
 * Lists all conversations related in the branching tree of a conversation.
 * It traverses up to find the root parent, then fetches all descendant branches.
 *
 * @param conversationId - The active conversation ID.
 */
export async function listBranches(conversationId: string): Promise<ConversationBranchItem[]> {
    const user = await requireUser();
    
    // Validate ownership
    await assertOwnsConversation(conversationId, user.id);

    // 1. Traverse up parent links to find the absolute root conversation ID
    let rootId = conversationId;
    let current = await prisma.conversation.findUnique({
        where: { id: rootId },
        select: { id: true, parentId: true },
    });

    while (current && current.parentId) {
        rootId = current.parentId;
        current = await prisma.conversation.findUnique({
            where: { id: rootId },
            select: { id: true, parentId: true },
        });
    }

    // 2. Fetch all conversations belonging to the user that are part of this branching family.
    const allUserConversations = await prisma.conversation.findMany({
        where: { userId: user.id, isArchived: false },
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            title: true,
            parentId: true,
            branchedFromMessageId: true,
            createdAt: true,
            lastMessageAt: true,
        },
    });

    // Helper to find all descendants of a given ID in the list
    const branchFamily = new Set<string>([rootId]);
    let addedNew = true;
    
    // Iteratively expand descendants set
    while (addedNew) {
        addedNew = false;
        for (const convo of allUserConversations) {
            if (convo.parentId && branchFamily.has(convo.parentId) && !branchFamily.has(convo.id)) {
                branchFamily.add(convo.id);
                addedNew = true;
            }
        }
    }

    // Filter conversations to only include members of this branch family
    return allUserConversations
        .filter((convo) => branchFamily.has(convo.id))
        .map((convo) => ({
            id: convo.id,
            title: convo.title,
            parentId: convo.parentId,
            branchedFromMessageId: convo.branchedFromMessageId,
            createdAt: convo.createdAt,
            lastMessageAt: convo.lastMessageAt,
            isActive: convo.id === conversationId,
        }));
}