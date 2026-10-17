-- Tiraze commerce schema (Cloudflare D1 / SQLite).
-- Money: INTEGER piastres, currency EGP. Time: INTEGER Unix epoch milliseconds (UTC).
-- Stock correctness is enforced inside the database: CHECK constraints forbid negative or
-- over-reserved stock, and triggers RAISE(ABORT) so that a D1 batch (one implicit
-- transaction) rolls back every statement when any line lacks stock or a price changed.

-- D1 enforces foreign keys by default (no PRAGMA needed in migrations).

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- ─── Staff roles (users live in Better Auth tables; see 0002) ────────────────
CREATE TABLE staff_roles (
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','catalog','fulfillment','support','finance')),
  granted_by TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, role)
);

-- ─── Catalogue ───────────────────────────────────────────────────────────────
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  product_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  kind TEXT NOT NULL DEFAULT 'ready' CHECK (kind IN ('ready','made_to_order')),
  category TEXT NOT NULL,
  -- 1 = clearly flagged test fixture; never shown when FIXTURES_VISIBLE is off.
  is_fixture INTEGER NOT NULL DEFAULT 0 CHECK (is_fixture IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX products_listing ON products (status, is_fixture, category, sort_order);

CREATE TABLE product_translations (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('ar','en')),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  material TEXT NOT NULL DEFAULT '',
  technique TEXT NOT NULL DEFAULT '',
  origin_note TEXT NOT NULL DEFAULT '',
  care TEXT NOT NULL DEFAULT '',
  search_text TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (product_id, locale),
  UNIQUE (locale, slug)
);

CREATE TABLE skus (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  width_cm INTEGER NOT NULL CHECK (width_cm > 0),
  length_cm INTEGER NOT NULL CHECK (length_cm > 0),
  color TEXT NOT NULL DEFAULT '',
  price_piastres INTEGER NOT NULL CHECK (price_piastres > 0),
  currency TEXT NOT NULL DEFAULT 'EGP' CHECK (currency = 'EGP'),
  is_unique INTEGER NOT NULL DEFAULT 1 CHECK (is_unique IN (0,1)),
  weight_g INTEGER NOT NULL CHECK (weight_g > 0),
  package_length_cm INTEGER NOT NULL CHECK (package_length_cm > 0),
  package_width_cm INTEGER NOT NULL CHECK (package_width_cm > 0),
  package_height_cm INTEGER NOT NULL CHECK (package_height_cm > 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX skus_product ON skus (product_id, active);
CREATE INDEX skus_price ON skus (price_piastres);

CREATE TABLE media (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_ar TEXT NOT NULL,
  alt_en TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER
);
CREATE INDEX media_product ON media (product_id, sort_order);

-- ─── Inventory ───────────────────────────────────────────────────────────────
CREATE TABLE inventory (
  sku_id TEXT PRIMARY KEY REFERENCES skus(id) ON DELETE CASCADE,
  on_hand INTEGER NOT NULL CHECK (on_hand >= 0),
  reserved INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  updated_at INTEGER NOT NULL,
  CHECK (reserved <= on_hand)
);

CREATE TABLE inventory_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku_id TEXT NOT NULL,
  delta_on_hand INTEGER NOT NULL,
  delta_reserved INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ref_type TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  actor_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX inventory_movements_sku ON inventory_movements (sku_id, created_at);
CREATE INDEX inventory_movements_ref ON inventory_movements (ref_type, ref_id);

-- ─── Customers ───────────────────────────────────────────────────────────────
CREATE TABLE addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  governorate TEXT NOT NULL,
  city TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX addresses_user ON addresses (user_id, deleted_at);

CREATE TABLE carts (
  user_id TEXT PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
CREATE TABLE cart_items (
  user_id TEXT NOT NULL REFERENCES carts(user_id) ON DELETE CASCADE,
  sku_id TEXT NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL CHECK (qty BETWEEN 1 AND 20),
  added_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, sku_id)
);

-- ─── Shipping matrix (versioned; orders keep a snapshot) ─────────────────────
CREATE TABLE shipping_versions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('draft','active','retired')),
  cod_carrier_limit_piastres INTEGER CHECK (cod_carrier_limit_piastres IS NULL OR cod_carrier_limit_piastres > 0),
  is_fixture INTEGER NOT NULL DEFAULT 0 CHECK (is_fixture IN (0,1)),
  created_by TEXT,
  created_at INTEGER NOT NULL,
  activated_at INTEGER
);
CREATE UNIQUE INDEX shipping_one_active ON shipping_versions (status) WHERE status = 'active';
CREATE TABLE shipping_zones (
  version_id TEXT NOT NULL REFERENCES shipping_versions(id) ON DELETE CASCADE,
  governorate TEXT NOT NULL,
  zone_code TEXT NOT NULL,
  PRIMARY KEY (version_id, governorate)
);
CREATE TABLE shipping_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version_id TEXT NOT NULL REFERENCES shipping_versions(id) ON DELETE CASCADE,
  zone_code TEXT NOT NULL,
  max_weight_g INTEGER NOT NULL CHECK (max_weight_g > 0),
  max_longest_cm INTEGER NOT NULL CHECK (max_longest_cm > 0),
  fee_piastres INTEGER NOT NULL CHECK (fee_piastres >= 0)
);
CREATE INDEX shipping_rates_lookup ON shipping_rates (version_id, zone_code, max_weight_g);

-- ─── Orders ──────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('awaiting_payment','pending_cod_review','confirmed','cancelled','completed')),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('unpaid','pending','paid','failed','refund_pending','partially_refunded','refunded','paid_unallocated')),
  fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled' CHECK (fulfillment_status IN ('unfulfilled','preparing','shipped','delivered','returned')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('kashier','cod')),
  subtotal_piastres INTEGER NOT NULL CHECK (subtotal_piastres > 0),
  shipping_piastres INTEGER NOT NULL CHECK (shipping_piastres >= 0),
  total_piastres INTEGER NOT NULL,
  paid_piastres INTEGER NOT NULL DEFAULT 0 CHECK (paid_piastres >= 0),
  refunded_piastres INTEGER NOT NULL DEFAULT 0 CHECK (refunded_piastres >= 0),
  currency TEXT NOT NULL DEFAULT 'EGP' CHECK (currency = 'EGP'),
  locale TEXT NOT NULL DEFAULT 'ar' CHECK (locale IN ('ar','en')),
  address_snapshot TEXT NOT NULL,
  shipping_snapshot TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  reservation_expires_at INTEGER NOT NULL,
  cancel_reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (total_piastres = subtotal_piastres + shipping_piastres),
  -- Cash on delivery: final total (incl. shipping) at most EGP 10,000.
  CHECK (payment_method <> 'cod' OR total_piastres <= 1000000),
  CHECK (refunded_piastres <= paid_piastres),
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX orders_user ON orders (user_id, created_at DESC);
CREATE INDEX orders_status ON orders (status, payment_status, fulfillment_status, created_at DESC);
CREATE INDEX orders_expiry ON orders (status, reservation_expires_at);

CREATE TABLE order_lines (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sku_id TEXT NOT NULL REFERENCES skus(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price_piastres INTEGER NOT NULL CHECK (unit_price_piastres > 0),
  line_total_piastres INTEGER NOT NULL,
  snapshot TEXT NOT NULL,
  CHECK (line_total_piastres = unit_price_piastres * qty),
  UNIQUE (order_id, sku_id)
);

-- Price/availability guard: a line is only accepted at the SKU's current price, for an active
-- SKU of a published product. Fails the whole checkout batch otherwise.
CREATE TRIGGER order_lines_price_guard BEFORE INSERT ON order_lines
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_PRICE_CHANGED')
  WHERE NOT EXISTS (
    SELECT 1 FROM skus s JOIN products p ON p.id = s.product_id
    WHERE s.id = NEW.sku_id AND s.active = 1 AND p.status = 'published' AND p.kind = 'ready'
      AND s.price_piastres = NEW.unit_price_piastres
  );
END;

CREATE TABLE reservations (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sku_id TEXT NOT NULL REFERENCES skus(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  status TEXT NOT NULL CHECK (status IN ('active','converted','released','expired')),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  closed_at INTEGER
);
CREATE INDEX reservations_order ON reservations (order_id, status);
CREATE INDEX reservations_expiry ON reservations (status, expires_at);
-- At most one active reservation per order line.
CREATE UNIQUE INDEX reservations_one_active ON reservations (order_id, sku_id) WHERE status = 'active';

-- Reserve stock atomically. RAISE(ABORT) aborts the statement and, inside a D1 batch, rolls
-- back the entire batch (order, lines and earlier reservations).
CREATE TRIGGER reservations_reserve AFTER INSERT ON reservations
WHEN NEW.status = 'active'
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_INSUFFICIENT_STOCK')
  WHERE NOT EXISTS (
    SELECT 1 FROM inventory WHERE sku_id = NEW.sku_id AND on_hand - reserved >= NEW.qty
  );
  UPDATE inventory SET reserved = reserved + NEW.qty, updated_at = NEW.created_at WHERE sku_id = NEW.sku_id;
  INSERT INTO inventory_movements (sku_id, delta_on_hand, delta_reserved, reason, ref_type, ref_id, created_at)
  VALUES (NEW.sku_id, 0, NEW.qty, 'reserve', 'order', NEW.order_id, NEW.created_at);
END;

CREATE TRIGGER reservations_release AFTER UPDATE OF status ON reservations
WHEN OLD.status = 'active' AND NEW.status IN ('released','expired')
BEGIN
  UPDATE inventory SET reserved = reserved - OLD.qty, updated_at = COALESCE(NEW.closed_at, OLD.created_at) WHERE sku_id = OLD.sku_id;
  INSERT INTO inventory_movements (sku_id, delta_on_hand, delta_reserved, reason, ref_type, ref_id, created_at)
  VALUES (OLD.sku_id, 0, -OLD.qty, NEW.status, 'order', OLD.order_id, COALESCE(NEW.closed_at, OLD.created_at));
END;

CREATE TRIGGER reservations_convert AFTER UPDATE OF status ON reservations
WHEN OLD.status = 'active' AND NEW.status = 'converted'
BEGIN
  UPDATE inventory SET on_hand = on_hand - OLD.qty, reserved = reserved - OLD.qty,
    updated_at = COALESCE(NEW.closed_at, OLD.created_at) WHERE sku_id = OLD.sku_id;
  INSERT INTO inventory_movements (sku_id, delta_on_hand, delta_reserved, reason, ref_type, ref_id, created_at)
  VALUES (OLD.sku_id, -OLD.qty, -OLD.qty, 'sold', 'order', OLD.order_id, COALESCE(NEW.closed_at, OLD.created_at));
END;

-- Closed reservations are final: no transition out of converted/released/expired.
CREATE TRIGGER reservations_final BEFORE UPDATE OF status ON reservations
WHEN OLD.status <> 'active' AND NEW.status <> OLD.status
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_RESERVATION_CLOSED');
END;

-- Confirming an order converts its active reservations exactly once; every line must still
-- hold an active reservation or the confirmation aborts.
CREATE TRIGGER orders_confirm AFTER UPDATE OF status ON orders
WHEN NEW.status = 'confirmed' AND OLD.status <> 'confirmed'
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_RESERVATION_MISSING')
  WHERE EXISTS (
    SELECT 1 FROM order_lines l WHERE l.order_id = NEW.id AND NOT EXISTS (
      SELECT 1 FROM reservations r WHERE r.order_id = NEW.id AND r.sku_id = l.sku_id AND r.status = 'active' AND r.qty = l.qty
    )
  );
  UPDATE reservations SET status = 'converted', closed_at = NEW.updated_at WHERE order_id = NEW.id AND status = 'active';
END;

-- Cancelling releases whatever is still reserved.
CREATE TRIGGER orders_cancel AFTER UPDATE OF status ON orders
WHEN NEW.status = 'cancelled' AND OLD.status <> 'cancelled'
BEGIN
  UPDATE reservations SET status = CASE WHEN NEW.cancel_reason = 'expired' THEN 'expired' ELSE 'released' END,
    closed_at = NEW.updated_at
  WHERE order_id = NEW.id AND status = 'active';
END;

-- A confirmed order whose stock was sold cannot be cancelled back into stock automatically;
-- returns are restocked only after inspection via an explicit inventory adjustment.

CREATE TABLE order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  actor_id TEXT,
  detail TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX order_events_order ON order_events (order_id, created_at);

-- ─── Payments ────────────────────────────────────────────────────────────────
CREATE TABLE payment_attempts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  provider TEXT NOT NULL CHECK (provider = 'kashier'),
  mode TEXT NOT NULL CHECK (mode IN ('test','live')),
  -- creating: request about to be sent; unknown: request outcome unknown (must reconcile)
  status TEXT NOT NULL CHECK (status IN ('creating','unknown','pending','succeeded','failed','expired','rejected')),
  amount_piastres INTEGER NOT NULL CHECK (amount_piastres > 0),
  currency TEXT NOT NULL DEFAULT 'EGP' CHECK (currency = 'EGP'),
  merchant_order_id TEXT NOT NULL UNIQUE,
  session_id TEXT UNIQUE,
  session_url TEXT,
  provider_order_id TEXT,
  provider_transaction_id TEXT,
  last_checked_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX payment_attempts_order ON payment_attempts (order_id, created_at);
CREATE INDEX payment_attempts_open ON payment_attempts (status, updated_at);
-- Only one unresolved attempt per order: an unknown outcome must be reconciled first.
CREATE UNIQUE INDEX payment_attempts_one_open ON payment_attempts (order_id) WHERE status IN ('creating','unknown','pending');
-- Success is final: a late failure never overrides it.
CREATE TRIGGER payment_attempts_success_final BEFORE UPDATE OF status ON payment_attempts
WHEN OLD.status = 'succeeded' AND NEW.status <> 'succeeded'
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_PAYMENT_SUCCESS_FINAL');
END;

-- Durable webhook inbox. Rows are written before the webhook is acknowledged.
CREATE TABLE payment_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  merchant_order_id TEXT,
  payload TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  processed_at INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  result TEXT,
  error TEXT
);
CREATE INDEX payment_events_unprocessed ON payment_events (processed_at, received_at);

CREATE TABLE refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  payment_attempt_id TEXT REFERENCES payment_attempts(id),
  amount_piastres INTEGER NOT NULL CHECK (amount_piastres > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('requested','pending','succeeded','failed','unknown')),
  idempotency_key TEXT NOT NULL UNIQUE,
  provider_reference TEXT,
  actor_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX refunds_order ON refunds (order_id);

-- Refunds may never exceed what was actually paid minus refunds already open or completed.
CREATE TRIGGER refunds_cap BEFORE INSERT ON refunds
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_REFUND_EXCEEDS_PAID')
  WHERE NEW.amount_piastres > (
    SELECT o.paid_piastres - COALESCE((SELECT SUM(r.amount_piastres) FROM refunds r
      WHERE r.order_id = NEW.order_id AND r.status IN ('requested','pending','succeeded','unknown')), 0)
    FROM orders o WHERE o.id = NEW.order_id
  ) OR NOT EXISTS (SELECT 1 FROM orders WHERE id = NEW.order_id);
END;

-- ─── Fulfilment ──────────────────────────────────────────────────────────────
CREATE TABLE shipments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  carrier TEXT NOT NULL,
  tracking_number TEXT NOT NULL,
  tracking_url TEXT,
  shipped_at INTEGER NOT NULL,
  delivered_at INTEGER,
  actor_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX shipments_order ON shipments (order_id);

-- COD collection is recorded separately from delivery and from carrier settlement.
CREATE TABLE cod_collections (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  amount_piastres INTEGER NOT NULL CHECK (amount_piastres > 0),
  reference TEXT NOT NULL,
  collected_recorded_by TEXT NOT NULL,
  collected_at INTEGER NOT NULL,
  settled_at INTEGER,
  settled_recorded_by TEXT
);

-- ─── Made-to-order quote requests ────────────────────────────────────────────
CREATE TABLE quote_requests (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  user_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  width_cm INTEGER NOT NULL,
  length_cm INTEGER NOT NULL,
  colors TEXT,
  material TEXT,
  budget_piastres INTEGER,
  contact_method TEXT NOT NULL CHECK (contact_method IN ('email','phone','whatsapp')),
  notes TEXT,
  locale TEXT NOT NULL CHECK (locale IN ('ar','en')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','quoted','closed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX quote_requests_status ON quote_requests (status, created_at DESC);

-- ─── Operations ──────────────────────────────────────────────────────────────
CREATE TABLE outbox (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  payload TEXT NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','dead','unknown')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL,
  locked_until INTEGER,
  lock_token TEXT,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  sent_at INTEGER
);
CREATE INDEX outbox_due ON outbox (status, next_attempt_at);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT,
  meta TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX audit_log_target ON audit_log (target_type, target_id, created_at);
CREATE INDEX audit_log_actor ON audit_log (actor_id, created_at);

CREATE TABLE idempotency_keys (
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (scope, key)
);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);

CREATE TABLE import_batches (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('validated','committed','rejected')),
  row_count INTEGER NOT NULL,
  product_count INTEGER NOT NULL,
  error_count INTEGER NOT NULL,
  errors TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE job_runs (
  name TEXT PRIMARY KEY,
  locked_until INTEGER,
  last_started_at INTEGER,
  last_finished_at INTEGER,
  last_result TEXT
);

-- Proposed (unapproved) plan defaults; owner approval is required before selling.
INSERT INTO settings (key, value, updated_at) VALUES
  ('reservation_minutes_online', '15', 0),
  ('cod_review_hours', '24', 0),
  ('require_verified_email', 'true', 0),
  ('checkout_enabled', 'true', 0),
  ('allowed_tracking_hosts', '[]', 0);
