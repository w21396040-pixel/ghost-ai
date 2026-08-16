import { clerkMiddleware } from "@clerk/nextjs/server";

// Auth is enforced per-route (pages, layouts, API routes, Server Functions)
// rather than here — see app/page.tsx, app/editor/**, app/api/**. This
// middleware only establishes the Clerk auth context for those checks;
// see https://clerk.com/docs/guides/development/upgrading/upgrade-guides/migrate-from-create-route-matcher
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
