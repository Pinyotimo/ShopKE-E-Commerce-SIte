ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price INT, ADD COLUMN IF NOT EXISTS sale_ends_at TIMESTAMPTZ;
DO $$ BEGIN ALTER TABLE products ADD CONSTRAINT sale_lt_price CHECK (sale_price IS NULL OR sale_price < price);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount INT NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference TEXT UNIQUE, ADD COLUMN IF NOT EXISTS paid_amount INT,
  ADD COLUMN IF NOT EXISTS note TEXT, ADD COLUMN IF NOT EXISTS matched_by INT REFERENCES users(id);

CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY, code TEXT UNIQUE NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('percent','fixed')),
  value INT NOT NULL CHECK (value > 0), min_subtotal INT NOT NULL DEFAULT 0, max_uses INT, used INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_events (
  id SERIAL PRIMARY KEY, order_id INT REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL, note TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY, product_id INT REFERENCES products(id) ON DELETE CASCADE, change INT NOT NULL,
  reason TEXT NOT NULL, order_id INT, user_id INT, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_events_idx ON order_events(order_id);
CREATE INDEX IF NOT EXISTS stock_mov_idx ON stock_movements(product_id, id DESC);

INSERT INTO order_events(order_id,status,note)
  SELECT id, status, 'Imported' FROM orders WHERE NOT EXISTS (SELECT 1 FROM order_events);
INSERT INTO coupons(code,kind,value,min_subtotal) VALUES ('WELCOME10','percent',10,1000),('SAVE200','fixed',200,2000) ON CONFLICT DO NOTHING;
UPDATE products SET sale_price=2800, sale_ends_at=now()+interval '3 days' WHERE name='Wireless Earbuds' AND price>2800;