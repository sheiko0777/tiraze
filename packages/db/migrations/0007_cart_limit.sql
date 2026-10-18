CREATE TRIGGER cart_line_limit BEFORE INSERT ON cart_items
WHEN NOT EXISTS (SELECT 1 FROM cart_items WHERE user_id=NEW.user_id AND sku_id=NEW.sku_id)
BEGIN
 SELECT RAISE(ABORT, 'TIRAZE_CART_LIMIT') WHERE (SELECT count(*) FROM cart_items WHERE user_id=NEW.user_id)>=50;
END;
