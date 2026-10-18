CREATE TRIGGER refunds_attempt_cap BEFORE INSERT ON refunds
WHEN NEW.payment_attempt_id IS NOT NULL
BEGIN
 SELECT RAISE(ABORT,'TIRAZE_REFUND_EXCEEDS_PAID') WHERE NOT EXISTS (SELECT 1 FROM payment_attempts WHERE id=NEW.payment_attempt_id AND order_id=NEW.order_id AND status='succeeded') OR NEW.amount_piastres > (SELECT amount_piastres-COALESCE((SELECT SUM(amount_piastres) FROM refunds WHERE payment_attempt_id=NEW.payment_attempt_id AND status IN ('requested','pending','unknown','succeeded')),0) FROM payment_attempts WHERE id=NEW.payment_attempt_id AND order_id=NEW.order_id AND status='succeeded');
END;
CREATE TRIGGER refunds_attempt_update_cap BEFORE UPDATE ON refunds
WHEN NEW.payment_attempt_id IS NOT NULL AND NEW.status IN ('requested','pending','unknown','succeeded')
BEGIN
 SELECT RAISE(ABORT,'TIRAZE_REFUND_EXCEEDS_PAID') WHERE NOT EXISTS (SELECT 1 FROM payment_attempts WHERE id=NEW.payment_attempt_id AND order_id=NEW.order_id AND status='succeeded') OR NEW.amount_piastres > (SELECT amount_piastres-COALESCE((SELECT SUM(amount_piastres) FROM refunds WHERE payment_attempt_id=NEW.payment_attempt_id AND id<>NEW.id AND status IN ('requested','pending','unknown','succeeded')),0) FROM payment_attempts WHERE id=NEW.payment_attempt_id AND order_id=NEW.order_id AND status='succeeded');
END;
CREATE TRIGGER refunds_identity_immutable BEFORE UPDATE ON refunds
WHEN NEW.order_id<>OLD.order_id OR COALESCE(NEW.payment_attempt_id,'')<>COALESCE(OLD.payment_attempt_id,'') OR NEW.amount_piastres<>OLD.amount_piastres OR (OLD.provider_reference IS NOT NULL AND COALESCE(NEW.provider_reference,'')<>OLD.provider_reference)
BEGIN
 SELECT RAISE(ABORT,'TIRAZE_REFUND_IMMUTABLE');
END;
