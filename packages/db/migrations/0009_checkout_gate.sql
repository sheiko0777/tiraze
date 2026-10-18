CREATE TRIGGER checkout_launch_guard BEFORE INSERT ON orders
WHEN NEW.checkout_cart_version IS NOT NULL
BEGIN
 SELECT RAISE(ABORT, 'TIRAZE_CHECKOUT_DISABLED') WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key='checkout_enabled' AND value='true');
 SELECT RAISE(ABORT, 'TIRAZE_ADDRESS_CHANGED') WHERE NOT EXISTS (SELECT 1 FROM addresses WHERE id=json_extract(NEW.address_snapshot,'$.id') AND user_id=NEW.user_id AND deleted_at IS NULL);
END;
