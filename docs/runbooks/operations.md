# Store operations and incidents

## Staff access

Customers never obtain roles during registration. The first owner is bootstrapped by a trusted operator in the intended database only after the account has verified email and verified TOTP enrollment. Check user emailVerified and twoFactorEnabled, then insert its user ID into staff_roles with role owner and an audit entry. Do not promote by request headers or build a public bootstrap endpoint. Confirm the intended database before any remote command. Later grants/revocations use the owner interface; the last owner cannot be removed.

Staff login uses password plus authenticator code. Re-enter a current TOTP code in the admin step-up form; its proof expires after 15 minutes. Catalog manages catalogue/import/inventory, fulfillment handles COD review/shipping, support handles bespoke enquiries and can read orders, finance handles refunds and cash, owner manages roles and shipping. Audit/outbox status views are owner-only. No interface returns auth email payloads.

## COD, shipping and settlement

Review a pending COD order before its hold expires. Confirm only after contacting the customer; this consumes reserved inventory but does not mark money received. Rejection/expiry releases the hold. Final COD total including shipping must be at most EGP 10,000 and within a lower carrier cap.

Prepare confirmed eligible orders; book the carrier manually; record carrier and tracking number. Tracking URLs are optional and must use an explicitly approved HTTPS host. Record actual delivery independently from collection. Finance records the exact final total with an evidence reference, then records carrier settlement separately. Inspect returned goods before adjusting stock. A delivery or refund event must never create automatic restock.

Shipping uses owner-approved, versioned zone/package matrices, with every unit treated as a separate package. This packing policy and the default 15-minute online/24-hour COD holds are implementation defaults pending operational acceptance. No matching zone/package means no quoted shipping; never guess a rate.

## Kashier and payment incidents

No merchant sandbox or live contract has been verified. Configure test keys only in the test environment first. Validate create-session and lookup schemas with the merchant API, allowed payment methods, signatures, expiry, duplicate/out-of-order events, unknown network outcomes and partial/full refunds before enabling sales.

A creating/unknown attempt blocks new attempts. Reconcile it against the merchant dashboard/API; do not delete the attempt to retry. A mismatched or unavailable lookup cannot confirm payment. If payment arrives after expiry, allocation is retried atomically; if unavailable, the order is paid_unallocated and fulfillment remains blocked. Review and refund/reallocate with documented evidence. A browser return is informational.

If two distinct attempts settle for one order, both charges are recorded while only one inventory allocation is consumed. Finance receives one duplicate-payment alert. Select the extra payment attempt ID when refunding it; the server enforces the remaining refundable amount for that specific attempt. Fulfillment after an extra-charge refund still requires net paid money to cover the order total.

Refund requests reserve their amount before contacting the provider, cannot exceed paid money minus other open/completed refunds, and use a persistent idempotency key. Unknown refunds remain unresolved and block overlapping requests. Refund webhooks prompt review. Pending/unknown refunds with a stored provider reference are checked by jobs using the authenticated order lookup. If the original response was lost without a reference, finance enters the exact Kashier refund transaction reference in the reconciliation form; the server verifies merchant, order, amount, currency, operation and target before changing state. A provider reference cannot settle two local refunds. Never match two refunds by amount alone. Retain merchant transaction evidence and test the resolution procedure before launch.

## Mail/jobs incidents

MAIL_ENABLED defaults false. Configure verified MAIL_FROM, RESEND_API_KEY and STAFF_ALERT_EMAIL only after approval. Jobs claim messages with leases, backoff and an 8-attempt limit. Resend receives a stable idempotency key; messages older than 23 hours become unknown instead of blindly resending outside the idempotency window. Review dead/unknown messages privately. Auth URLs expire; generate a fresh verification/reset message rather than sending an expired link. A mail failure does not roll back an order.

Run jobs against the same D1 database as web. Production cron is configured for every 5 minutes but has not been deployed. Verify actual execution, alert delivery, provider limits and job lease duration under the selected runtime plan. Monitor unprocessed payment inbox, unknown attempts/refunds, paid_unallocated, pending COD expiry, stock/ledger discrepancies, dead mail, cash settlement gaps and 5xx. No production uptime or CPU target has been proven.

## Kill switch, secrets and recovery

Use the owner intake control to set checkout_enabled=false and stop new orders atomically; preserve existing attempts and reconciliation. During an incident do not erase payment/stock rows. Rotate exposed provider/auth credentials in the affected environment; revoke sessions when needed; inspect the audit log without copying secrets or customer data into chat/issues.

Before restoring a database, stop new orders, disable mail/jobs and shipping operations, preserve the incident snapshot, restore into a separate environment, compare orders/inventory/paid/refunded totals, reconcile with Kashier, and prevent replay of already-sent messages or shipments. Code rollback does not undo migrations.

Opening intake is fail-closed: development requires ALLOW_TEST_CHECKOUT=true explicitly; production additionally requires COMMERCE_LAUNCH_READY=true, configured Kashier credentials, an approved non-fixture shipping matrix and a non-fixture published product. COMMERCE_LAUNCH_READY is an operator attestation after all launch gates, not proof generated by the code. It has not been enabled.
