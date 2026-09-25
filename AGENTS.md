# Launch Planner: notes for agents

Launch Planner is a B2B SaaS for property marketers: plan, scope and cost a
property project's marketing (deliverables, budget, schedule, suppliers), with
Stripe subscriptions. It is live at https://launchplanner.com.au.

## Stack and hosting

- TanStack Start (React 19, file-based routes in `src/routes`, generated
  `src/routeTree.gen.ts`), Vite, Tailwind v4, shadcn/ui, bun.
- Hosted on Vercel: project `launch-planner` in the team `markleedrs-projects`.
  Production builds come from the branch `claude/epic-cori-ldhw3i` and serve
  `launchplanner.com.au` and `www.launchplanner.com.au`. Every other pushed
  branch gets a preview deployment.
- Supabase project `ufskbrgrqlkuhxzvyram` for auth, database and storage. It
  holds production data with real customers and subscriptions: never write
  test data to it. For screenshots or previews, hydrate `PlannerProvider` with
  a fabricated snapshot instead.
- Transactional email goes through Resend. Stripe handles billing.
- Environment variables live in the Vercel project settings; `.env.example`
  lists them. On Vercel the Supabase admin key is `SB_SECRET_KEY`.
- Files in `public/` are served from the site root, for example
  `/hero-placeholders/apartments.jpg`.

This project started on Lovable but is no longer connected to it: the Lovable
project has been deleted. The `@lovable.dev/*` packages are still part of the
build, and the `lovable` naming in `src/routes/lovable/**` and
`src/lib/lovable-error-reporting.ts` is legacy. Don't look for a Lovable
project or expect commits to sync anywhere.

## Checks

Run these from the repo root before every commit:

- `bun run typecheck`
- `bun run test`
- `bun run build`
- `bunx eslint <files you changed>` and `bunx prettier --write <files you changed>`

`bun run lint` on the whole repo reports about 1,200 pre-existing formatting
errors in files nobody has touched recently. Don't mass-reformat the repo;
format only the files you change.

## Branches and releasing

- Work on the branch the session gives you (`claude/<name>`). Push it as you
  go; Vercel builds a preview for each push.
- Nothing merges into production automatically. To release, merge your branch
  into `claude/epic-cori-ldhw3i` with a merge commit (`git merge --no-ff`),
  run the checks on the result, and push. That push deploys to production, so
  get Mark's explicit approval in chat first and expect the environment to ask
  for confirmation.
- After pushing, confirm the Vercel production deployment reaches READY and
  spot-check the live site.
- Never rewrite pushed history on any branch: no force-push, rebase, amend or
  squash of commits that are already on GitHub. Other sessions work on
  `claude/epic-cori-ldhw3i` at the same time.
- There is no `main` branch, and the repo doesn't use pull requests.
