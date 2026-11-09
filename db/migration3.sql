-- Migration 3: product photo galleries, keeping all existing data.
-- Use this instead of reset.sql if you want to keep your orders and users.
-- Run:  psql "$DATABASE_URL" -f db/migration3.sql
BEGIN;

ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE users    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Existing products start with their current photo as the whole gallery.
UPDATE products SET images = ARRAY[image_url]
  WHERE cardinality(images) = 0 AND COALESCE(image_url, '') <> '';

DROP TRIGGER IF EXISTS products_sync_images ON products;
DROP FUNCTION IF EXISTS sync_product_images();
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


CREATE INDEX IF NOT EXISTS payments_order_idx      ON payments(order_id);
CREATE INDEX IF NOT EXISTS order_items_product_idx ON order_items(product_id);

COMMIT;
