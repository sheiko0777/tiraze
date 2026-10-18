CREATE TABLE admin_step_up (session_id TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
CREATE TRIGGER address_limit BEFORE INSERT ON addresses
BEGIN
 SELECT RAISE(ABORT, 'TIRAZE_ADDRESS_LIMIT') WHERE (SELECT count(*) FROM addresses WHERE user_id = NEW.user_id AND deleted_at IS NULL) >= 20;
END;
