# ChaiGPT 🍵

ChaiGPT is a premium, next-generation AI chat application built with **Next.js 16**, **Vercel AI SDK 7.x**, **Prisma 7**, and **Clerk**. It features an interactive, real-time web search tool calling system and support for multi-path conversation branching.

---

## 🌟 Key Features

### 🔍 1. Real-time Web Search (AI Tool Calling)
*   **Intelligent Invocation:** The assistant naturally decides when to search the web based on your queries (e.g., current events, news, or technical releases).
*   **Streamed Execution:** Shows real-time search indicators (pulsing globe spinner) and streams final responses concurrently.
*   **Collapsible Previews:** Lists search results inside an expandable card grid complete with source site domains, titles, and snippets.
*   **Resilient Fallbacks:** Integrates Tavily/Serper search APIs with an automated keyless HTML parser fallback (DuckDuckGo Lite) and simulation fallbacks to ensure uninterrupted operation.

### 🌿 2. Conversation Branching
*   **Fork from Any Message:** Hover over any message bubble and click the branch button to fork the discussion into an independent path.
*   **Shared Past, Independent Future:** Each branch preserves the original message history up to the branching point, but generates its own replies going forward.
*   **Premium Header Switcher:** Grouped branch families can be explored and selected instantly from an elegant dropdown selector in the chat header.

---

## 🛠️ Tech Stack

*   **Framework:** [Next.js 16 (App Router)](https://nextjs.org/)
*   **AI Integration:** [Vercel AI SDK 7.x](https://sdk.ai.dev/) (featuring `streamText`, `tool`, and custom template literal parts type-safety)
*   **Authentication:** [Clerk Auth](https://clerk.com/) (with custom lazy-onboarding syncing profiles to DB on-demand)
*   **Database ORM:** [Prisma 7](https://www.prisma.io/) (utilizing the new Prisma 7 driver adapter schema architecture)
*   **UI Components:** [Base UI](https://base-ui.com/) (accessible, interactive triggers, collapsibles, and dialog overlays)
*   **Styling:** TailwindCSS with a clean dark/glassmorphic aesthetic

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies
Clone the repository and install the npm packages:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```bash
# Clerk Keys (from https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your-clerk-publishable-key"
CLERK_SECRET_KEY="your-clerk-secret-key"

# OpenAI API Key (from https://platform.openai.com)
OPENAI_API_KEY="your-openai-api-key"

# Database Connection (PostgreSQL connection URL)
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-blue-cloud-a2xyz.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
```
> [!TIP]
> For local database-less testing, you can temporarily switch the datasource provider inside [schema.prisma](./prisma/schema.prisma) to `sqlite` and use `DATABASE_URL="file:./dev.db"`.

### 3. Sync Database Schema
Initialize your database tables and generate the Prisma Client bindings:
```bash
npx prisma db push
```

### 4. Run the Application
Start the development server:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📂 Codebase Overview

*   `app/api/chat/route.ts`: Contains the main API endpoint handling streamed responses, system prompt context, and the Zod-validated `webSearch` tool.
*   `features/conversation/actions/conversation-actions.ts`: Includes server actions for creating branches (`createBranch`) and building parent-child relation trees (`listBranches`).
*   `features/conversation/components/chat-messages.tsx`: Core message list renderer rendering Markdown parts, tool loading/collapsible panels, and hover branch fork buttons.
*   `features/conversation/components/conversation-view.tsx`: Main viewport component hosting the Header Branch Switcher dropdown.
*   `lib/db.ts`: Singleton database client module utilizing the `@prisma/adapter-pg` driver.
