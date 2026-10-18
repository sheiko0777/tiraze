-- SQLite INTEGER affinity alone accepts fractional numbers.
CREATE TRIGGER skus_integer_insert BEFORE INSERT ON skus
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_INTEGER_REQUIRED') WHERE typeof(NEW.width_cm) <> 'integer' OR abs(NEW.width_cm) > 9007199254740991 OR typeof(NEW.length_cm) <> 'integer' OR abs(NEW.length_cm) > 9007199254740991 OR typeof(NEW.price_piastres) <> 'integer' OR abs(NEW.price_piastres) > 9007199254740991 OR typeof(NEW.weight_g) <> 'integer' OR abs(NEW.weight_g) > 9007199254740991 OR typeof(NEW.package_length_cm) <> 'integer' OR abs(NEW.package_length_cm) > 9007199254740991 OR typeof(NEW.package_width_cm) <> 'integer' OR abs(NEW.package_width_cm) > 9007199254740991 OR typeof(NEW.package_height_cm) <> 'integer' OR abs(NEW.package_height_cm) > 9007199254740991;
END;

CREATE TRIGGER skus_integer_update BEFORE UPDATE ON skus
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_INTEGER_REQUIRED') WHERE typeof(NEW.width_cm) <> 'integer' OR abs(NEW.width_cm) > 9007199254740991 OR typeof(NEW.length_cm) <> 'integer' OR abs(NEW.length_cm) > 9007199254740991 OR typeof(NEW.price_piastres) <> 'integer' OR abs(NEW.price_piastres) > 9007199254740991 OR typeof(NEW.weight_g) <> 'integer' OR abs(NEW.weight_g) > 9007199254740991 OR typeof(NEW.package_length_cm) <> 'integer' OR abs(NEW.package_length_cm) > 9007199254740991 OR typeof(NEW.package_width_cm) <> 'integer' OR abs(NEW.package_width_cm) > 9007199254740991 OR typeof(NEW.package_height_cm) <> 'integer' OR abs(NEW.package_height_cm) > 9007199254740991;
END;

CREATE TRIGGER inventory_integer_insert BEFORE INSERT ON inventory
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_INTEGER_REQUIRED') WHERE typeof(NEW.on_hand) <> 'integer' OR abs(NEW.on_hand) > 9007199254740991 OR typeof(NEW.reserved) <> 'integer' OR abs(NEW.reserved) > 9007199254740991;
END;

CREATE TRIGGER inventory_integer_update BEFORE UPDATE ON inventory
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_INTEGER_REQUIRED') WHERE typeof(NEW.on_hand) <> 'integer' OR abs(NEW.on_hand) > 9007199254740991 OR typeof(NEW.reserved) <> 'integer' OR abs(NEW.reserved) > 9007199254740991;
END;

CREATE TRIGGER orders_integer_insert BEFORE INSERT ON orders
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_INTEGER_REQUIRED') WHERE typeof(NEW.subtotal_piastres) <> 'integer' OR abs(NEW.subtotal_piastres) > 9007199254740991 OR typeof(NEW.shipping_piastres) <> 'integer' OR abs(NEW.shipping_piastres) > 9007199254740991 OR typeof(NEW.total_piastres) <> 'integer' OR abs(NEW.total_piastres) > 9007199254740991 OR typeof(NEW.paid_piastres) <> 'integer' OR abs(NEW.paid_piastres) > 9007199254740991 OR typeof(NEW.refunded_piastres) <> 'integer' OR abs(NEW.refunded_piastres) > 9007199254740991;
END;

CREATE TRIGGER orders_integer_update BEFORE UPDATE ON orders
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_INTEGER_REQUIRED') WHERE typeof(NEW.subtotal_piastres) <> 'integer' OR abs(NEW.subtotal_piastres) > 9007199254740991 OR typeof(NEW.shipping_piastres) <> 'integer' OR abs(NEW.shipping_piastres) > 9007199254740991 OR typeof(NEW.total_piastres) <> 'integer' OR abs(NEW.total_piastres) > 9007199254740991 OR typeof(NEW.paid_piastres) <> 'integer' OR abs(NEW.paid_piastres) > 9007199254740991 OR typeof(NEW.refunded_piastres) <> 'integer' OR abs(NEW.refunded_piastres) > 9007199254740991;
END;

CREATE TRIGGER order_lines_integer_insert BEFORE INSERT ON order_lines
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_INTEGER_REQUIRED') WHERE typeof(NEW.qty) <> 'integer' OR abs(NEW.qty) > 9007199254740991 OR typeof(NEW.unit_price_piastres) <> 'integer' OR abs(NEW.unit_price_piastres) > 9007199254740991 OR typeof(NEW.line_total_piastres) <> 'integer' OR abs(NEW.line_total_piastres) > 9007199254740991;
END;

CREATE TRIGGER order_lines_integer_update BEFORE UPDATE ON order_lines
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_INTEGER_REQUIRED') WHERE typeof(NEW.qty) <> 'integer' OR abs(NEW.qty) > 9007199254740991 OR typeof(NEW.unit_price_piastres) <> 'integer' OR abs(NEW.unit_price_piastres) > 9007199254740991 OR typeof(NEW.line_total_piastres) <> 'integer' OR abs(NEW.line_total_piastres) > 9007199254740991;
END;

CREATE TRIGGER reservations_integer_insert BEFORE INSERT ON reservations
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_INTEGER_REQUIRED') WHERE typeof(NEW.qty) <> 'integer' OR abs(NEW.qty) > 9007199254740991;
END;

CREATE TRIGGER reservations_integer_update BEFORE UPDATE ON reservations
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_INTEGER_REQUIRED') WHERE typeof(NEW.qty) <> 'integer' OR abs(NEW.qty) > 9007199254740991;
END;

CREATE TRIGGER refunds_integer_insert BEFORE INSERT ON refunds
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_INTEGER_REQUIRED') WHERE typeof(NEW.amount_piastres) <> 'integer' OR abs(NEW.amount_piastres) > 9007199254740991;
END;

CREATE TRIGGER refunds_integer_update BEFORE UPDATE ON refunds
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_INTEGER_REQUIRED') WHERE typeof(NEW.amount_piastres) <> 'integer' OR abs(NEW.amount_piastres) > 9007199254740991;
END;

CREATE TRIGGER payment_attempts_integer_insert BEFORE INSERT ON payment_attempts
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_INTEGER_REQUIRED') WHERE typeof(NEW.amount_piastres) <> 'integer' OR abs(NEW.amount_piastres) > 9007199254740991;
END;

CREATE TRIGGER payment_attempts_integer_update BEFORE UPDATE ON payment_attempts
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_INTEGER_REQUIRED') WHERE typeof(NEW.amount_piastres) <> 'integer' OR abs(NEW.amount_piastres) > 9007199254740991;
END;

CREATE TRIGGER cart_items_integer_insert BEFORE INSERT ON cart_items
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_INTEGER_REQUIRED') WHERE typeof(NEW.qty) <> 'integer' OR abs(NEW.qty) > 9007199254740991;
END;

CREATE TRIGGER cart_items_integer_update BEFORE UPDATE ON cart_items
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_INTEGER_REQUIRED') WHERE typeof(NEW.qty) <> 'integer' OR abs(NEW.qty) > 9007199254740991;
END;

CREATE TRIGGER cod_collections_integer_insert BEFORE INSERT ON cod_collections
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_INTEGER_REQUIRED') WHERE typeof(NEW.amount_piastres) <> 'integer' OR abs(NEW.amount_piastres) > 9007199254740991;
END;

CREATE TRIGGER cod_collections_integer_update BEFORE UPDATE ON cod_collections
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_INTEGER_REQUIRED') WHERE typeof(NEW.amount_piastres) <> 'integer' OR abs(NEW.amount_piastres) > 9007199254740991;
END;

CREATE TRIGGER shipping_rates_integer_insert BEFORE INSERT ON shipping_rates
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_INTEGER_REQUIRED') WHERE typeof(NEW.fee_piastres) <> 'integer' OR abs(NEW.fee_piastres) > 9007199254740991 OR typeof(NEW.max_weight_g) <> 'integer' OR abs(NEW.max_weight_g) > 9007199254740991 OR typeof(NEW.max_longest_cm) <> 'integer' OR abs(NEW.max_longest_cm) > 9007199254740991;
END;

CREATE TRIGGER shipping_rates_integer_update BEFORE UPDATE ON shipping_rates
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_INTEGER_REQUIRED') WHERE typeof(NEW.fee_piastres) <> 'integer' OR abs(NEW.fee_piastres) > 9007199254740991 OR typeof(NEW.max_weight_g) <> 'integer' OR abs(NEW.max_weight_g) > 9007199254740991 OR typeof(NEW.max_longest_cm) <> 'integer' OR abs(NEW.max_longest_cm) > 9007199254740991;
END;

CREATE TRIGGER inventory_unique_insert BEFORE INSERT ON inventory
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_UNIQUE_STOCK') WHERE NEW.on_hand > 1 AND EXISTS (SELECT 1 FROM skus WHERE id = NEW.sku_id AND is_unique = 1);
END;

CREATE TRIGGER inventory_unique_update BEFORE UPDATE ON inventory
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_UNIQUE_STOCK') WHERE NEW.on_hand > 1 AND EXISTS (SELECT 1 FROM skus WHERE id = NEW.sku_id AND is_unique = 1);
END;

CREATE TRIGGER skus_unique_guard BEFORE UPDATE OF is_unique ON skus
WHEN NEW.is_unique = 1
BEGIN
  SELECT RAISE(ABORT, 'TIRAZE_UNIQUE_STOCK') WHERE EXISTS (SELECT 1 FROM inventory WHERE sku_id = NEW.id AND on_hand > 1);
END;
