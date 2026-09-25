import { createFileRoute } from "@tanstack/react-router";
import { processPendingEmailOutbox } from "@/lib/procurement/notifications.server";

export const Route = createFileRoute("/api/workflows/process")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorised(request)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        try {
          const email = await processPendingEmailOutbox();
          return Response.json({ ok: true, email });
        } catch (error) {
          console.error("[Project workflows] Scheduled processing failed.", {
            message: error instanceof Error ? error.message : "Unknown error",
          });
          return Response.json({ error: "Workflow processing failed." }, { status: 500 });
        }
      },
    },
  },
});

function isAuthorised(request: Request): boolean {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return false;
  const token = header.slice("Bearer ".length).trim();
  const validTokens = [
    process.env.SB_SECRET_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SECRET_KEY,
  ].filter((value): value is string => Boolean(value));
  return validTokens.some((value) => value === token);
}
