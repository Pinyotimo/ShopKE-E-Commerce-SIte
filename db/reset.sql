-- =====================================================================
-- ShopKE: full database reset
-- Drops EVERYTHING and recreates the schema with sample data.
-- Run:  psql "$DATABASE_URL" -f db/reset.sql
-- All money columns are whole Kenyan shillings (INT).
-- =====================================================================

BEGIN;

-- 1. Drop existing tables (children first; CASCADE catches the rest) ---
DROP TABLE IF EXISTS notifications   CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS order_events    CASCADE;
DROP TABLE IF EXISTS refunds         CASCADE;
DROP TABLE IF EXISTS payments        CASCADE;
DROP TABLE IF EXISTS order_items     CASCADE;
DROP TABLE IF EXISTS orders          CASCADE;
DROP TABLE IF EXISTS coupons         CASCADE;
DROP TABLE IF EXISTS products        CASCADE;
DROP TABLE IF EXISTS users           CASCADE;
DROP FUNCTION IF EXISTS sync_product_images() CASCADE;

-- 2. Tables ------------------------------------------------------------

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','staff','admin')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE products (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  price        INT  NOT NULL CHECK (price > 0),
  stock        INT  NOT NULL DEFAULT 0 CHECK (stock >= 0),
  -- Cover photo, used by cards, cart, categories and receipts.
  image_url    TEXT,
  -- Gallery for the slider, in display order. images[1] is the cover.
  images       TEXT[] NOT NULL DEFAULT '{}',
  category     TEXT DEFAULT 'General',
  active       BOOLEAN DEFAULT TRUE,
  sale_price   INT,
  sale_ends_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT sale_lt_price CHECK (sale_price IS NULL OR sale_price < price)
);

-- Keeps image_url and images in step, so code that only sets one still works:
--  * only image_url given  -> images = {image_url}
--  * images given          -> image_url = images[1] (the cover)
CREATE FUNCTION sync_product_images() RETURNS trigger AS $$
BEGIN
  NEW.images := COALESCE(array_remove(NEW.images, ''), '{}');
  IF TG_OP = 'INSERT' THEN
    IF cardinality(NEW.images) > 0 THEN
      NEW.image_url := NEW.images[1];
    ELSIF COALESCE(NEW.image_url, '') <> '' THEN
      NEW.images := ARRAY[NEW.image_url];
    END IF;
  ELSIF NEW.images IS DISTINCT FROM OLD.images THEN
    -- Gallery edited: the cover follows its first photo.
    IF cardinality(NEW.images) > 0 THEN
      NEW.image_url := NEW.images[1];
    ELSIF COALESCE(NEW.image_url, '') <> '' THEN
      NEW.images := ARRAY[NEW.image_url];
    END IF;
  ELSIF NEW.image_url IS DISTINCT FROM OLD.image_url THEN
    -- Only the cover changed: move it to the front of the gallery
    -- (or, if it was cleared, fall back to the first gallery photo).
    IF COALESCE(NEW.image_url, '') <> '' THEN
      NEW.images := ARRAY[NEW.image_url] || array_remove(NEW.images, NEW.image_url);
    ELSE
      NEW.image_url := NEW.images[1];
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER products_sync_images
  BEFORE INSERT OR UPDATE OF image_url, images ON products
  FOR EACH ROW EXECUTE FUNCTION sync_product_images();

CREATE TABLE coupons (
  id           SERIAL PRIMARY KEY,
  code         TEXT UNIQUE NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('percent','fixed')),
  value        INT  NOT NULL CHECK (value > 0),
  min_subtotal INT  NOT NULL DEFAULT 0,
  max_uses     INT,
  used         INT  NOT NULL DEFAULT 0,
  expires_at   TIMESTAMPTZ,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE orders (
  id           SERIAL PRIMARY KEY,
  user_id      INT REFERENCES users(id),
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','packed','out_for_delivery','delivered','cancelled','refunded')),
  subtotal     INT NOT NULL,
  discount     INT NOT NULL DEFAULT 0,
  coupon_code  TEXT,
  delivery_fee INT NOT NULL,
  total        INT NOT NULL,
  address      TEXT NOT NULL,
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  distance_km  NUMERIC(5,1),
  phone        TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INT REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT REFERENCES products(id),
  name       TEXT NOT NULL,
  price      INT  NOT NULL,
  qty        INT  NOT NULL
);

CREATE TABLE payments (
  id                  SERIAL PRIMARY KEY,
  order_id            INT REFERENCES orders(id),
  method              TEXT DEFAULT 'mpesa',
  status              TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','review','refunded')),
  amount              INT NOT NULL,
  paid_amount         INT,
  checkout_request_id TEXT UNIQUE,
  reference           TEXT UNIQUE,
  mpesa_receipt       TEXT,
  note                TEXT,
  matched_by          INT REFERENCES users(id),
  raw                 JSONB,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE refunds (
  id              SERIAL PRIMARY KEY,
  order_id        INT REFERENCES orders(id),
  payment_id      INT REFERENCES payments(id),
  amount          INT  NOT NULL,
  reason          TEXT NOT NULL,
  status          TEXT DEFAULT 'requested' CHECK (status IN ('requested','processing','refunded','rejected','failed')),
  conversation_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE order_events (
  id         SERIAL PRIMARY KEY,
  order_id   INT REFERENCES orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE stock_movements (
  id         SERIAL PRIMARY KEY,
  product_id INT REFERENCES products(id) ON DELETE CASCADE,
  change     INT  NOT NULL,
  reason     TEXT NOT NULL,
  order_id   INT,
  user_id    INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INT REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT DEFAULT '',
  link       TEXT,
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Indexes -----------------------------------------------------------
CREATE INDEX orders_user_idx         ON orders(user_id);
CREATE INDEX order_items_order_idx   ON order_items(order_id);
CREATE INDEX order_items_product_idx ON order_items(product_id);
CREATE INDEX payments_order_idx      ON payments(order_id);
CREATE INDEX refunds_order_idx       ON refunds(order_id);
CREATE INDEX products_category_idx   ON products(category);
CREATE INDEX order_events_idx        ON order_events(order_id);
CREATE INDEX stock_mov_idx           ON stock_movements(product_id, id DESC);
CREATE INDEX notifications_user_idx  ON notifications(user_id, read);

-- 4. Sample products: 4 photos each for the slider ---------------------
-- Photos are placeholder stock images from picsum.photos (random scenes,
-- stable per seed). Replace with real product photos before going live.
INSERT INTO products (name, description, price, stock, category, images) VALUES
('Wireless Earbuds Pro',
 'Bluetooth 5.3 earbuds with active noise cancellation and a pocket-size charging case.
• Up to 8 h listening, 24 h with the case
• IPX5 sweat and splash resistant
• Touch controls and built-in mic for calls
• USB-C fast charge: 10 minutes gives 1 hour of play',
 3500, 50, 'Electronics',
 ARRAY['https://picsum.photos/seed/earbuds-1/800/800','https://picsum.photos/seed/earbuds-2/800/800','https://picsum.photos/seed/earbuds-3/800/800','https://picsum.photos/seed/earbuds-4/800/800']),

('Adjustable Phone Stand',
 'Solid aluminium desk stand that holds phones and small tablets at any angle.
• Fits devices from 4 to 11 inches
• Silicone pads protect your phone and stop sliding
• Folds flat to carry in a bag
• Cable slot for charging while you watch',
 700, 200, 'Electronics',
 ARRAY['https://picsum.photos/seed/stand-1/800/800','https://picsum.photos/seed/stand-2/800/800','https://picsum.photos/seed/stand-3/800/800','https://picsum.photos/seed/stand-4/800/800']),

('20,000 mAh Power Bank',
 'Charge your phone up to four times on one fill. Ideal for blackouts and long matatu rides.
• Two USB-A ports and one USB-C in/out
• 22.5 W fast charging
• LED shows the charge left
• Slim, lightweight body',
 2900, 60, 'Electronics',
 ARRAY['https://picsum.photos/seed/powerbank-1/800/800','https://picsum.photos/seed/powerbank-2/800/800','https://picsum.photos/seed/powerbank-3/800/800','https://picsum.photos/seed/powerbank-4/800/800']),

('Smart Fitness Watch',
 'Track steps, heart rate, sleep and workouts, and see calls and WhatsApp messages on your wrist.
• 1.8 inch bright touch screen
• Up to 10 days battery
• Water resistant for swimming
• Works with Android and iPhone',
 4800, 35, 'Electronics',
 ARRAY['https://picsum.photos/seed/watch-1/800/800','https://picsum.photos/seed/watch-2/800/800','https://picsum.photos/seed/watch-3/800/800','https://picsum.photos/seed/watch-4/800/800']),

('Kikoy Beach Towel',
 'Soft, quick-drying kikoy woven from 100% cotton on the Kenyan coast. Use it as a towel, wrap or picnic throw.
• 100 x 170 cm
• Hand-knotted tassels
• Gets softer with every wash',
 950, 120, 'Home',
 ARRAY['https://picsum.photos/seed/kikoy-1/800/800','https://picsum.photos/seed/kikoy-2/800/800','https://picsum.photos/seed/kikoy-3/800/800','https://picsum.photos/seed/kikoy-4/800/800']),

('Handwoven Sisal Basket',
 'Traditional kiondo basket handwoven from natural sisal with leather straps. Great for the market, storage or as a gift.
• Medium size, about 30 cm across
• Each piece is unique
• Made by women''s groups in Machakos',
 1600, 40, 'Home',
 ARRAY['https://picsum.photos/seed/kiondo-1/800/800','https://picsum.photos/seed/kiondo-2/800/800','https://picsum.photos/seed/kiondo-3/800/800','https://picsum.photos/seed/kiondo-4/800/800']),

('Ceramic Coffee Mug Set (4)',
 'Four stoneware mugs with a glazed finish, perfect for chai or coffee.
• 350 ml each
• Microwave and dishwasher safe
• Comes gift boxed',
 1400, 70, 'Home',
 ARRAY['https://picsum.photos/seed/mugs-1/800/800','https://picsum.photos/seed/mugs-2/800/800','https://picsum.photos/seed/mugs-3/800/800','https://picsum.photos/seed/mugs-4/800/800']),

('Kenya AA Coffee 1 kg',
 'Single-origin AA beans from the slopes of Mt Kenya, medium roasted for bright, fruity notes with a smooth finish.
• Whole beans, or ask us to grind
• Roasted in small batches in Nairobi
• Notes of blackcurrant, citrus and brown sugar',
 1800, 80, 'Food',
 ARRAY['https://picsum.photos/seed/coffee-1/800/800','https://picsum.photos/seed/coffee-2/800/800','https://picsum.photos/seed/coffee-3/800/800','https://picsum.photos/seed/coffee-4/800/800']),

('Kericho Gold Tea 500 g',
 'Rich, full-bodied black tea from the highlands of Kericho. Brews a strong, golden cup that is perfect with milk.
• 500 g loose leaf
• Grown at over 2,000 m
• Resealable pack',
 650, 150, 'Food',
 ARRAY['https://picsum.photos/seed/tea-1/800/800','https://picsum.photos/seed/tea-2/800/800','https://picsum.photos/seed/tea-3/800/800','https://picsum.photos/seed/tea-4/800/800']),

('Raw Forest Honey 500 g',
 'Pure, unprocessed honey collected from beehives in the Kakamega forest.
• No added sugar or preservatives
• Naturally crystallises; warm gently to soften
• Glass jar',
 900, 90, 'Food',
 ARRAY['https://picsum.photos/seed/honey-1/800/800','https://picsum.photos/seed/honey-2/800/800','https://picsum.photos/seed/honey-3/800/800','https://picsum.photos/seed/honey-4/800/800']),

('Maasai Shuka Blanket',
 'The classic red-check shuka in thick, warm acrylic. Use it as a throw, a picnic blanket or a wrap on chilly evenings.
• 150 x 200 cm
• Machine washable
• Fringed edges',
 1200, 100, 'Fashion',
 ARRAY['https://picsum.photos/seed/shuka-1/800/800','https://picsum.photos/seed/shuka-2/800/800','https://picsum.photos/seed/shuka-3/800/800','https://picsum.photos/seed/shuka-4/800/800']),

('Leather Sandals',
 'Handmade leather sandals with a cushioned sole, made in Kariokor, Nairobi.
• Genuine cow leather
• Sizes 37 to 45
• Hard-wearing rubber sole',
 2200, 45, 'Fashion',
 ARRAY['https://picsum.photos/seed/sandals-1/800/800','https://picsum.photos/seed/sandals-2/800/800','https://picsum.photos/seed/sandals-3/800/800','https://picsum.photos/seed/sandals-4/800/800']),

('Beaded Bracelet Set',
 'Three colourful bracelets hand-beaded by Maasai artisans. A small gift that supports local craft.
• Adjustable, fits most wrists
• Glass beads on strong thread
• Colours vary slightly',
 550, 4, 'Fashion',
 ARRAY['https://picsum.photos/seed/beads-1/800/800','https://picsum.photos/seed/beads-2/800/800','https://picsum.photos/seed/beads-3/800/800','https://picsum.photos/seed/beads-4/800/800']),

('Shea Butter Body Cream',
 'Rich moisturiser made with unrefined shea butter and coconut oil for dry skin.
• 250 ml jar
• No parabens
• Light, natural scent',
 850, 0, 'Beauty',
 ARRAY['https://picsum.photos/seed/shea-1/800/800','https://picsum.photos/seed/shea-2/800/800','https://picsum.photos/seed/shea-3/800/800','https://picsum.photos/seed/shea-4/800/800']);

-- Flash sales (shown on Deals and the landing page while they run)
UPDATE products SET sale_price = 2800, sale_ends_at = now() + interval '3 days' WHERE name = 'Wireless Earbuds Pro';
UPDATE products SET sale_price = 2300, sale_ends_at = now() + interval '1 day'  WHERE name = '20,000 mAh Power Bank';
UPDATE products SET sale_price = 1500, sale_ends_at = now() + interval '2 days' WHERE name = 'Kenya AA Coffee 1 kg';

-- Opening stock in the stock log
INSERT INTO stock_movements (product_id, change, reason)
  SELECT id, stock, 'initial stock' FROM products WHERE stock > 0;

-- 5. Coupons -----------------------------------------------------------
INSERT INTO coupons (code, kind, value, min_subtotal) VALUES
  ('WELCOME10', 'percent', 10, 1000),
  ('SAVE200',   'fixed',  200, 2000);

COMMIT;

-- 6. Make yourself the owner ---------------------------------------------
-- No users are seeded (passwords must be hashed by the app). Sign up in the
-- shop, then run:
--   UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
