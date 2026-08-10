import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  `${process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}(.*)`,
  `${process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL}(.*)`,
]);

// API routes handle their own auth() checks and return 401/403 JSON directly
// (see app/api/**) — auth.protect() would otherwise redirect or 404 unauthenticated
// fetch requests instead of letting the route handler respond with JSON.
const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isApiRoute(req)) {
    return;
  }
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
