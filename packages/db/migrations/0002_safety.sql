-- Fail closed until the merchant launch checklist has evidence.
UPDATE settings SET value = 'false' WHERE key = 'checkout_enabled';

ALTER TABLE orders ADD COLUMN checkout_cart_version INTEGER;
CREATE TRIGGER checkout_snapshot_guard BEFORE INSERT ON orders
WHEN NEW.checkout_cart_version IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_CART_CHANGED') WHERE NOT EXISTS (
    SELECT 1 FROM carts WHERE user_id = NEW.user_id AND version = NEW.checkout_cart_version
  );
  SELECT RAISE(ABORT, 'TIRAZE_SHIPPING_CHANGED') WHERE NOT EXISTS (
    SELECT 1 FROM shipping_versions WHERE id = json_extract(NEW.shipping_snapshot, '$.versionId') AND status = 'active'
  );
END;

-- A guard statement aborts its entire D1 batch when a previously read state changed.
CREATE TABLE operation_guards (id TEXT PRIMARY KEY, ok INTEGER NOT NULL);
CREATE TRIGGER operation_guard BEFORE INSERT ON operation_guards
WHEN NEW.ok <> 1
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_OPERATION_CONFLICT');
END;

ALTER TABLE payment_events ADD COLUMN processing_token TEXT;
ALTER TABLE payment_events ADD COLUMN locked_until INTEGER;

CREATE TRIGGER refunds_success_final BEFORE UPDATE ON refunds
WHEN OLD.status = 'succeeded' AND (NEW.status <> 'succeeded' OR NEW.amount_piastres <> OLD.amount_piastres OR NEW.order_id <> OLD.order_id)
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_REFUND_SUCCESS_FINAL');
END;
CREATE TRIGGER refunds_update_cap BEFORE UPDATE ON refunds
WHEN NEW.status IN ('requested','pending','succeeded','unknown')
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_REFUND_EXCEEDS_PAID') WHERE NEW.amount_piastres > (
    SELECT paid_piastres - COALESCE((SELECT SUM(amount_piastres) FROM refunds
      WHERE order_id = NEW.order_id AND id <> NEW.id AND status IN ('requested','pending','succeeded','unknown')), 0)
    FROM orders WHERE id = NEW.order_id
  );
END;
