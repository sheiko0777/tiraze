# Local development

Prerequisites: Node 24 or newer and pnpm 10.30.3. The root static preview is preserved; commerce lives in apps/web, shared rules in packages/core, data services/migrations in packages/db, and scheduled work in apps/jobs.

Run from the repository root:

~~~powershell
pnpm install --frozen-lockfile
pnpm setup:local
pnpm dev
~~~

The setup creates an ignored random apps/web/.dev.vars only if none exists, then migrates local D1. It never provisions a remote database. Open the printed URL, normally http://localhost:4321/ar. Development accepts loopback preview origins; production uses the configured APP_URL only.

For a built preview:

~~~powershell
pnpm build
pnpm --filter @tiraze/web preview --host 127.0.0.1 --port 4330
~~~

Open http://localhost:4330/ar or /en. Stop a preview before rebuilding its output folder on Windows. Web output is apps/web/build; jobs output is a Wrangler dry-run bundle, not a deployment.

Checks:

~~~powershell
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
~~~

The browser check needs Playwright Chromium or installed Edge. Install Chromium with pnpm exec playwright install chromium if needed. E2E uses port 4330 by default; E2E_ORIGIN overrides it. It sends a synthetic local enquiry and does not call a payment or email provider.

Optional fixtures:

~~~powershell
pnpm db:seed:fixtures:local
~~~

Add FIXTURES_VISIBLE=true only to local .dev.vars and restart/rebuild. Fixture prices and stock are synthetic and explicitly labelled. The seed does not enable checkout. The default catalogue has no invented production inventory. Checkout defaults closed even if its setting is missing.

Local mail is captured in the outbox; external delivery stays off. Test suites verify email links against isolated test D1 databases without a production bypass endpoint. For manual verification use the local D1 explorer privately; never paste or commit verification URLs. Staff accounts must enroll and verify TOTP before receiving a role.

The root legacy preview can still run with pnpm preview:legacy. Legacy rendering checks are not commerce integration evidence.
