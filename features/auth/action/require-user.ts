import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { onBoard } from "./onboard";

/**
 * Ensures the request is authenticated and the user has completed onboarding.
 *
 * @returns The Prisma `User` linked to the current Clerk session.
 * @throws {Error} When the user record does not exist in the database.
 */
export async function requireUser() {
    const { userId } = await auth.protect();
  
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });
  
    if (!user) {
      // Lazy onboarding to prevent race condition when first loading the app
      user = await onBoard();
    }
  
    return user;
  }
  