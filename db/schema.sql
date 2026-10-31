CREATE TABLE users (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer'
);
CREATE TABLE products (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '',
  price INT NOT NULL CHECK (price > 0), stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url TEXT, category TEXT DEFAULT 'General', active BOOLEAN DEFAULT TRUE
);
CREATE TABLE orders (
  id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','packed','out_for_delivery','delivered','cancelled','refunded')),
  subtotal INT NOT NULL, delivery_fee INT NOT NULL, total INT NOT NULL,
  address TEXT NOT NULL, lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL,
  distance_km NUMERIC(5,1), phone TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY, order_id INT REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT REFERENCES products(id), name TEXT NOT NULL, price INT NOT NULL, qty INT NOT NULL
);
CREATE TABLE payments (
  id SERIAL PRIMARY KEY, order_id INT REFERENCES orders(id), method TEXT DEFAULT 'mpesa',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','review','refunded')),
  amount INT NOT NULL, checkout_request_id TEXT UNIQUE, mpesa_receipt TEXT, raw JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE refunds (
  id SERIAL PRIMARY KEY, order_id INT REFERENCES orders(id), payment_id INT REFERENCES payments(id),
  amount INT NOT NULL, reason TEXT NOT NULL,
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested','processing','refunded','rejected','failed')),
  conversation_id TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON orders(user_id); CREATE INDEX ON order_items(order_id);
CREATE INDEX ON refunds(order_id); CREATE INDEX ON products(category);

INSERT INTO products(name,description,price,stock,image_url,category) VALUES
('Wireless Earbuds','Bluetooth 5.3, 24h battery',3500,50,'https://picsum.photos/seed/a/400','Electronics'),
('Kikoy Towel','100% cotton',950,120,'https://picsum.photos/seed/b/400','Home'),
('Kenya AA Coffee 1kg','Medium roast',1800,80,'https://picsum.photos/seed/c/400','Food'),
('Phone Stand','Adjustable aluminium',700,200,'https://picsum.photos/seed/d/400','Electronics');