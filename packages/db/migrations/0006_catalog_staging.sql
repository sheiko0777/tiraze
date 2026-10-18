ALTER TABLE import_batches ADD COLUMN payload TEXT;
ALTER TABLE import_batches ADD COLUMN cursor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE import_batches ADD COLUMN approved_at INTEGER;
CREATE TABLE import_products (batch_id TEXT NOT NULL REFERENCES import_batches(id),product_id TEXT NOT NULL REFERENCES products(id),desired_status TEXT NOT NULL CHECK(desired_status IN ('draft','published')),PRIMARY KEY(batch_id,product_id));
