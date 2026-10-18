import type { D1Database, ScheduledController, ExecutionContext } from '@cloudflare/workers-types';
import { expireOrders } from '../../../packages/db/src/operations.ts';
import {
  claimOutbox,
  markOutboxFailed,
  markOutboxSent,
  first,
  reconcileAttempts,
  reconcileOpenRefunds,
  processPendingEvents,
  type OutboxMessage,
} from '@tiraze/db';
import type { KashierConfig } from '@tiraze/core';
export interface JobsEnv {
  DB: D1Database;
  APP_URL: string;
  MAIL_ENABLED?: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  STAFF_ALERT_EMAIL?: string;
  KASHIER_MODE?: string;
  KASHIER_MERCHANT_ID?: string;
  KASHIER_API_KEY?: string;
  KASHIER_SECRET_KEY?: string;
}
export async function sendMessage(
  env: JobsEnv,
  message: OutboxMessage,
  now: number,
  send: typeof fetch = fetch,
) {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) throw new Error('mail_not_configured');
  if (message.topic === 'email.auth' && now - message.createdAt > 3600000) {
    await env.DB.prepare(
      "UPDATE outbox SET status='dead',payload='{}',last_error='auth_link_expired',locked_until=NULL WHERE id=? AND lock_token=?",
    )
      .bind(message.id, message.lockToken)
      .run();
    return;
  }
  // Provider idempotency lasts 24h. Stop rather than risking a second send after that window.
  if (now - message.createdAt > 23 * 3600000) {
    await env.DB.prepare(
      "UPDATE outbox SET status='unknown',last_error='delivery_window_expired',locked_until=NULL WHERE id=? AND lock_token=?",
    )
      .bind(message.id, message.lockToken)
      .run();
    return;
  }
  const p = message.payload;
  let to = typeof p.to === 'string' ? p.to : null;
  let text = '',
    subject = 'Tiraze / تيراز';
  if (message.topic === 'alert.staff') {
    to = env.STAFF_ALERT_EMAIL ?? null;
    text =
      'Operations review required. Reference: ' +
      String(p.orderId ?? p.reference ?? p.attemptId ?? message.id);
  } else if (message.topic === 'email.auth') {
    subject =
      p.kind === 'reset_password'
        ? 'Tiraze — reset password / استعادة كلمة المرور'
        : 'Tiraze — verify email / تأكيد البريد';
    const url = new URL(String(p.url));
    if (url.origin !== new URL(env.APP_URL).origin) throw new Error('unsafe_auth_link');
    text = subject + '\n\n' + url.href + '\n\nIgnore this message if you did not request it.';
  } else if (p.orderId) {
    const order = await first<{ number: string; locale: string; email: string }>(
      env.DB,
      'SELECT o.number,o.locale,u.email FROM orders o JOIN user u ON u.id=o.user_id WHERE o.id=?',
      p.orderId,
    );
    if (!order) throw new Error('order_missing');
    to = order.email;
    text =
      'Tiraze ' +
      order.number +
      '\n' +
      message.topic.replace('email.', '') +
      '\n' +
      new URL('/' + order.locale + '/orders/' + p.orderId, env.APP_URL).href;
  } else if (message.topic === 'email.quote_received') {
    text = 'Tiraze — enquiry received / استلمنا طلبك\nReference: ' + String(p.reference);
  }
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error('recipient_missing');
  const result = await send('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.RESEND_API_KEY,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'tiraze-outbox/' + message.id,
    },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text }),
    signal: AbortSignal.timeout(15000),
  });
  if (!result.ok) throw new Error('mail_provider_' + result.status);
  const receipt = (await result.json()) as { id?: unknown };
  if (typeof receipt.id !== 'string') throw new Error('mail_receipt_missing');
  await markOutboxSent(env.DB, message, Date.now());
}
export async function runJobs(env: JobsEnv, now = Date.now()) {
  const lease = await env.DB.prepare(
    "INSERT INTO job_runs (name,locked_until,last_started_at) VALUES ('maintenance',?,?) ON CONFLICT(name) DO UPDATE SET locked_until=excluded.locked_until,last_started_at=excluded.last_started_at WHERE job_runs.locked_until IS NULL OR job_runs.locked_until<=? RETURNING name",
  )
    .bind(now + 240000, now, now)
    .all();
  if (!lease.results.length) return { skipped: true };
  try {
    const expired = await expireOrders(env.DB, now);
    if (
      ['test', 'live'].includes(env.KASHIER_MODE ?? '') &&
      env.KASHIER_MERCHANT_ID &&
      env.KASHIER_API_KEY &&
      env.KASHIER_SECRET_KEY
    ) {
      const cfg: KashierConfig = {
        mode: env.KASHIER_MODE as 'test' | 'live',
        merchantId: env.KASHIER_MERCHANT_ID,
        apiKey: env.KASHIER_API_KEY,
        secretKey: env.KASHIER_SECRET_KEY,
      };
      await processPendingEvents(env.DB, cfg, now, 2);
      await reconcileAttempts(env.DB, cfg, now, { limit: 2 });
      await reconcileOpenRefunds(env.DB, cfg, now, 2);
    }
    // Claim one message at a time; its lease is longer than the HTTP timeout.
    if (env.MAIL_ENABLED === 'true')
      for (let i = 0; i < 4; i++) {
        const [message] = await claimOutbox(env.DB, Date.now(), 1);
        if (!message) break;
        try {
          await sendMessage(env, message, Date.now());
        } catch {
          await markOutboxFailed(env.DB, message, 'delivery_failed', Date.now());
        }
      }
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE outbox SET payload='{}',status=CASE WHEN status='sent' THEN status ELSE 'dead' END,last_error=CASE WHEN status='sent' THEN last_error ELSE 'auth_link_expired' END WHERE topic='email.auth' AND created_at<? AND payload<>'{}'",
      ).bind(now - 3600000),
      env.DB.prepare('DELETE FROM rate_limits WHERE window_start<?').bind(now - 86400000),
      env.DB.prepare('DELETE FROM admin_step_up WHERE expires_at<?').bind(now),
      env.DB.prepare(
        "UPDATE outbox SET payload='{}' WHERE status='sent' AND sent_at<? AND payload<>'{}'",
      ).bind(now - 7 * 86400000),
      env.DB.prepare(
        'DELETE FROM payment_events WHERE processed_at IS NOT NULL AND processed_at<?',
      ).bind(now - 30 * 86400000),
      env.DB.prepare(
        "UPDATE job_runs SET locked_until=NULL,last_finished_at=?,last_result='ok' WHERE name='maintenance' AND last_started_at=?",
      ).bind(now, now),
    ]);
    return { expired };
  } catch (error) {
    await env.DB.prepare(
      "UPDATE job_runs SET locked_until=NULL,last_result='failed' WHERE name='maintenance' AND last_started_at=?",
    )
      .bind(now)
      .run();
    throw error;
  }
}
export default {
  async fetch() {
    return new Response('Not found', { status: 404 });
  },
  async scheduled(_controller: ScheduledController, env: JobsEnv, ctx: ExecutionContext) {
    ctx.waitUntil(runJobs(env));
  },
};
