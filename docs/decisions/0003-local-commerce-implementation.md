# ADR 0003 — Local commerce implementation

Date: 2026-10-18. Status: implemented on the development branch; production adoption remains conditional on merchant integration, CPU/load and recovery evidence.

The implementation uses Astro SSR on Workers, Better Auth with the built-in D1 adapter and TOTP, and native D1 SQL for commerce. Drizzle was a proposal in the plan, not an installed requirement. Native SQL makes inventory triggers, guarded updates and D1 batch rollback explicit and testable. No ORM or second database has been added.

The independent jobs Worker handles expiry, payment reconciliation and the transactional email outbox. Both deployed Workers must bind the same production D1 ID; local placeholders do not create remote resources. Mail delivery defaults off. Kashier test and live keys must be isolated by environment. A payment return URL never marks an order paid.

Because Kashier's documented signature covers data fields rather than the outer event name, successful payment webhooks additionally require an authenticated merchant-order lookup matching merchant order, amount, currency and provider IDs. Refund webhooks are recorded for review rather than automatically matched by amount. Exact provider-reference reconciliation now exists for pending/unknown refunds, including an authenticated order lookup and a uniqueness constraint preventing reference reuse. The merchant sandbox contract and operational procedure remain unproven.

CSV imports validate first, stage one SKU per bounded transaction, and publish the approved file only after every row is staged. A failed browser request can resume using the import ID. Staged products stay in draft. An initial 1000-record catalogue test is local emulator evidence, not a production load result.

The approved homepage is carried into SSR by a build-time dependency extraction of its editorial renderers; legacy local-storage and event code is excluded. The legacy root preview remains separate. Assets and generated editorial modules are derived during build, not edited twice.

No production D1, R2, mail domain, billing plan, DNS or live payment was provisioned by this implementation.
