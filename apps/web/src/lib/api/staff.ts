import type { ApiContext } from './context.ts';
import {
  inventoryAdjustInput,
  codDecisionInput,
  refundInput,
  shipmentInput,
  codCollectionInput,
  shippingTableInput,
  staffRoleInput,
  quoteStatusInput,
  IMPORT_COLUMNS,
} from '@tiraze/core';
import { all, first, requestRefund, reconcileRefund, activateShippingVersion } from '@tiraze/db';
import { validateImport, stepImport } from '../../../../../packages/db/src/imports.ts';
import {
  fulfill,
  recordCodCollection,
  settleCod,
} from '../../../../../packages/db/src/fulfillment.ts';
import {
  rolesFor,
  hasRole,
  adjustInventory,
  decideCod,
  cancelOrder,
  guard,
} from '../../../../../packages/db/src/operations.ts';
import { auditStmt } from '../../../../../packages/db/src/audit.ts';
import { readJson, response } from '../security.ts';
import { kashier } from './payment-config.ts';
export async function staffRoute(context: ApiContext): Promise<Response | null> {
  const { request, env, path, db, now, method, auth, session } = context;
  const user = session.user;
  if (path === 'admin/step-up' && method === 'POST') {
    if (!(await rolesFor(db, user.id)).length || !user.twoFactorEnabled)
      return response({ error: 'staff_mfa_required' }, 403);
    const body = (await readJson(request)) as { code?: unknown };
    if (typeof body.code !== 'string' || !/^\d{6}$/.test(body.code))
      return response({ error: 'invalid_code' }, 400);
    await auth.api.verifyTOTP({
      headers: request.headers,
      body: { code: body.code, trustDevice: false },
    });
    await db
      .prepare(
        'INSERT INTO admin_step_up (session_id,expires_at) VALUES (?,?) ON CONFLICT(session_id) DO UPDATE SET expires_at=excluded.expires_at',
      )
      .bind(session.session.id, now + 900000)
      .run();
    return response({ ok: true });
  }
  if (path.startsWith('admin/')) {
    const roles = await rolesFor(db, user.id);
    if (!roles.length || !user.emailVerified || !user.twoFactorEnabled)
      return response({ error: 'staff_mfa_required' }, 403);
    const proof = await first(
      db,
      'SELECT session_id FROM admin_step_up WHERE session_id=? AND expires_at>?',
      session.session.id,
      now,
    );
    if (!proof) return response({ error: 'step_up_required' }, 403);
    const area = path.split('/')[1],
      id = path.split('/')[2],
      action = path.split('/')[3];
    const required =
      area === 'catalog' || area === 'inventory' || area === 'imports'
        ? 'catalog'
        : area === 'refunds' || area === 'collections' || area === 'payments'
          ? 'finance'
          : area === 'quotes'
            ? 'support'
            : area === 'roles' ||
                area === 'settings' ||
                area === 'shipping' ||
                area === 'audit' ||
                area === 'outbox'
              ? 'owner'
              : 'fulfillment';
    if (
      !hasRole(roles, required) &&
      !(
        area === 'orders' &&
        method === 'GET' &&
        (hasRole(roles, 'support') || hasRole(roles, 'finance'))
      )
    )
      return response({ error: 'forbidden' }, 403);
    if (method === 'GET' && area === 'imports' && id === 'template')
      return new Response(IMPORT_COLUMNS.join(',') + '\n', {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="tiraze-catalog.csv"',
          'Cache-Control': 'no-store',
        },
      });
    if (method === 'GET') {
      const tables: Record<string, string> = {
        orders: 'orders',
        inventory: 'inventory',
        catalog: 'products',
        quotes: 'quote_requests',
        audit: 'audit_log',
        outbox: 'outbox',
        refunds: 'refunds',
        payments: 'payment_attempts',
        imports: 'import_batches',
      };
      if (area === 'audit' && !roles.includes('owner'))
        return response({ error: 'forbidden' }, 403);
      if (tables[area!]) {
        const columns =
          area === 'payments'
            ? 'id,order_id,mode,status,amount_piastres,merchant_order_id,provider_order_id,provider_transaction_id,created_at'
            : area === 'outbox'
              ? 'id,topic,status,attempts,last_error,created_at,sent_at'
              : area === 'imports'
                ? 'id,actor_id,status,row_count,product_count,error_count,errors,cursor,created_at'
                : area === 'orders'
                  ? 'id,number,user_id,status,payment_status,fulfillment_status,payment_method,total_piastres,paid_piastres,refunded_piastres,address_snapshot,created_at'
                  : '*';
        return response(
          await all(db, 'SELECT ' + columns + ' FROM ' + tables[area!] + ' LIMIT 100'),
        );
      }
    }
    const body = await readJson(request, area === 'imports' ? 2 * 1024 * 1024 : 16384);
    if (area === 'imports' && method === 'POST') {
      if (id && action === 'step') return response(await stepImport(db, user.id, id, now));
      const d = body as { csv?: unknown };
      if (typeof d.csv !== 'string') return response({ error: 'invalid_input' }, 400);
      return response(
        await validateImport(
          db,
          user.id,
          d.csv,
          [new URL(env.APP_URL).hostname, ...(env.MEDIA_HOSTS ?? '').split(',').filter(Boolean)],
          now,
        ),
      );
    }
    if (area === 'catalog' && id && method === 'PATCH') {
      const d = body as { status?: unknown; pricePiastres?: unknown; skuId?: unknown };
      if (d.status !== undefined) {
        if (!['draft', 'published', 'archived'].includes(String(d.status)))
          return response({ error: 'invalid_input' }, 400);
        await db.batch([
          ...(d.status === 'published'
            ? guard(
                db,
                "EXISTS (SELECT 1 FROM products WHERE id=?) AND (SELECT count(*) FROM product_translations WHERE product_id=? AND title<>'' AND description<>'' AND material<>'' AND technique<>'' AND origin_note<>'')=2 AND EXISTS (SELECT 1 FROM media WHERE product_id=? AND alt_ar<>'' AND alt_en<>'') AND EXISTS (SELECT 1 FROM skus WHERE product_id=? AND active=1) AND NOT EXISTS (SELECT 1 FROM import_products ip JOIN import_batches b ON b.id=ip.batch_id WHERE ip.product_id=? AND b.status<>'committed')",
                [id, id, id, id, id],
              )
            : []),
          db
            .prepare('UPDATE products SET status=?,updated_at=? WHERE id=?')
            .bind(d.status, now, id),
          auditStmt(
            db,
            {
              actorId: user.id,
              action: 'catalog.status',
              targetType: 'product',
              targetId: id,
              meta: { status: d.status },
            },
            now,
          ),
        ]);
        return response({ ok: true });
      }
      if (
        typeof d.skuId !== 'string' ||
        !Number.isSafeInteger(d.pricePiastres) ||
        Number(d.pricePiastres) < 1
      )
        return response({ error: 'invalid_input' }, 400);
      await db.batch([
        ...guard(db, 'EXISTS (SELECT 1 FROM skus WHERE id=? AND product_id=?)', [d.skuId, id]),
        db
          .prepare('UPDATE skus SET price_piastres=?,updated_at=? WHERE id=? AND product_id=?')
          .bind(d.pricePiastres, now, d.skuId, id),
        auditStmt(
          db,
          {
            actorId: user.id,
            action: 'catalog.price',
            targetType: 'sku',
            targetId: d.skuId,
            meta: { pricePiastres: d.pricePiastres },
          },
          now,
        ),
      ]);
      return response({ ok: true });
    }
    if (area === 'settings' && method === 'POST') {
      const d = body as { checkoutEnabled?: unknown };
      if (typeof d.checkoutEnabled !== 'boolean') return response({ error: 'invalid_input' }, 400);
      if (
        d.checkoutEnabled &&
        !(
          (env.ENVIRONMENT === 'development' && env.ALLOW_TEST_CHECKOUT === 'true') ||
          (env.ENVIRONMENT === 'production' && env.COMMERCE_LAUNCH_READY === 'true' && kashier(env))
        )
      )
        return response({ error: 'launch_readiness_required' }, 409);
      if (d.checkoutEnabled && env.ENVIRONMENT === 'production') {
        const ready = await first(
          db,
          "SELECT 1 FROM shipping_versions WHERE status='active' AND is_fixture=0",
        );
        const products = await first(
          db,
          "SELECT 1 FROM products WHERE status='published' AND is_fixture=0 LIMIT 1",
        );
        if (!ready || !products) return response({ error: 'launch_readiness_required' }, 409);
      }
      await db.batch([
        db
          .prepare("UPDATE settings SET value=?,updated_at=? WHERE key='checkout_enabled'")
          .bind(String(d.checkoutEnabled), now),
        auditStmt(
          db,
          {
            actorId: user.id,
            action: 'checkout.gate',
            targetType: 'setting',
            targetId: 'checkout_enabled',
            meta: { enabled: d.checkoutEnabled },
          },
          now,
        ),
      ]);
      return response({ ok: true });
    }
    if (area === 'orders' && id && action === 'cancel' && method === 'POST') {
      const d = body as { reason?: unknown };
      if (typeof d.reason !== 'string' || d.reason.trim().length < 3 || d.reason.length > 300)
        return response({ error: 'invalid_input' }, 400);
      await cancelOrder(db, user.id, id, d.reason, now);
      return response({ ok: true });
    }
    if (area === 'inventory' && method === 'POST') {
      const d = inventoryAdjustInput.parse(body);
      await adjustInventory(db, user.id, d.skuId, d.delta, d.reason, now);
      return response({ ok: true });
    }
    if (area === 'orders' && id && action === 'cod' && method === 'POST') {
      const d = codDecisionInput.parse(body);
      await decideCod(db, user.id, id, d.decision, d.reason, now);
      return response({ ok: true });
    }
    if (
      area === 'orders' &&
      id &&
      ['prepare', 'ship', 'deliver', 'return'].includes(action ?? '') &&
      method === 'POST'
    ) {
      await fulfill(
        db,
        user.id,
        id,
        action as 'prepare' | 'ship' | 'deliver' | 'return',
        now,
        action === 'ship' ? shipmentInput.parse(body) : undefined,
      );
      return response({ ok: true });
    }
    if (area === 'collections' && id && method === 'POST') {
      if (action === 'settle') {
        const d = body as { reference?: unknown };
        if (typeof d.reference !== 'string' || d.reference.length < 3 || d.reference.length > 120)
          return response({ error: 'invalid_input' }, 400);
        await settleCod(db, user.id, id, d.reference, now);
      } else {
        const d = codCollectionInput.parse(body);
        await recordCodCollection(db, user.id, id, d.amountPiastres, d.reference, now);
      }
      return response({ ok: true });
    }
    if (area === 'refunds' && id && action === 'reconcile' && method === 'POST') {
      const cfg = kashier(env);
      if (!cfg) return response({ error: 'payments_not_configured' }, 503);
      const d = body as { providerTransactionId?: unknown };
      if (typeof d.providerTransactionId !== 'string' || d.providerTransactionId.length > 120)
        return response({ error: 'invalid_input' }, 400);
      const r = await reconcileRefund(db, cfg, {
        refundId: id,
        providerTransactionId: d.providerTransactionId,
        actorId: user.id,
        now,
      });
      return response(r, r.ok ? 200 : 409);
    }
    if (area === 'refunds' && id && method === 'POST') {
      const d = refundInput.parse(body);
      return response(
        await requestRefund(db, kashier(env), { ...d, orderId: id, actorId: user.id, now }),
      );
    }
    if (area === 'shipping' && method === 'POST') {
      const d = shippingTableInput.parse(body);
      return response({ versionId: await activateShippingVersion(db, d, user.id, now) });
    }
    if (area === 'quotes' && id && method === 'PATCH') {
      const d = quoteStatusInput.parse(body);
      await db.batch([
        db
          .prepare('UPDATE quote_requests SET status=?,updated_at=? WHERE id=?')
          .bind(d.status, now, id),
        auditStmt(
          db,
          {
            actorId: user.id,
            action: 'quote.update',
            targetType: 'quote',
            targetId: id,
            reason: d.note,
          },
          now,
        ),
      ]);
      return response({ ok: true });
    }
    if (area === 'roles' && method === 'POST') {
      const d = staffRoleInput.parse(body);
      const target = await first<{ id: string; emailVerified: number; twoFactorEnabled: number }>(
        db,
        'SELECT id,emailVerified,twoFactorEnabled FROM user WHERE email=?',
        d.email.toLowerCase(),
      );
      if (!target || !target.emailVerified || !target.twoFactorEnabled)
        return response({ error: 'verified_mfa_account_required' }, 409);
      await db.batch([
        ...(d.grant
          ? []
          : guard(
              db,
              "? <> 'owner' OR NOT EXISTS (SELECT 1 FROM staff_roles WHERE user_id=? AND role='owner') OR (SELECT count(*) FROM staff_roles WHERE role='owner')>1",
              [d.role, target.id],
            )),
        d.grant
          ? db
              .prepare(
                'INSERT OR IGNORE INTO staff_roles (user_id,role,granted_by,created_at) VALUES (?,?,?,?)',
              )
              .bind(target.id, d.role, user.id, now)
          : db
              .prepare('DELETE FROM staff_roles WHERE user_id=? AND role=?')
              .bind(target.id, d.role),
        auditStmt(
          db,
          {
            actorId: user.id,
            action: d.grant ? 'role.grant' : 'role.revoke',
            targetType: 'user',
            targetId: target.id,
            meta: { role: d.role },
          },
          now,
        ),
      ]);
      return response({ ok: true });
    }
  }

  return null;
}
