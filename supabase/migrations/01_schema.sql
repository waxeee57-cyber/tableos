-- ============================================
-- TableOS Core Schema
-- ============================================

CREATE TABLE business_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL DEFAULT 'My Restaurant',
  tagline text DEFAULT 'Fresh food, delivered fast.',
  logo_url text,
  primary_color text DEFAULT '#E85D04',
  phone text,
  email text,
  address text,
  city text,
  country text DEFAULT 'Hungary',
  currency text DEFAULT 'HUF',
  currency_symbol text DEFAULT 'Ft',
  locale text DEFAULT 'hu',
  timezone text DEFAULT 'Europe/Budapest',
  delivery_enabled boolean DEFAULT true,
  takeaway_enabled boolean DEFAULT true,
  dine_in_enabled boolean DEFAULT false,
  table_management_enabled boolean DEFAULT false,
  delivery_fee integer DEFAULT 0,
  delivery_fee_threshold integer DEFAULT 0,
  min_order_amount integer DEFAULT 0,
  delivery_radius_km integer DEFAULT 10,
  estimated_delivery_minutes integer DEFAULT 45,
  operating_hours jsonb DEFAULT '{
    "mon": null,
    "tue": {"open": "11:00", "close": "20:00"},
    "wed": {"open": "11:00", "close": "20:00"},
    "thu": {"open": "11:00", "close": "20:00"},
    "fri": {"open": "11:00", "close": "20:00"},
    "sat": {"open": "11:00", "close": "20:00"},
    "sun": null
  }'::jsonb,
  meta_description text,
  og_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'staff', 'kitchen')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text,
  slug text UNIQUE NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES menu_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  name_en text,
  slug text UNIQUE NOT NULL,
  description text,
  description_en text,
  prices jsonb NOT NULL DEFAULT '[{"size": null, "price": 0}]'::jsonb,
  allergens text[] DEFAULT '{}',
  is_vegetarian boolean DEFAULT false,
  is_vegan boolean DEFAULT false,
  is_spicy boolean DEFAULT false,
  is_new boolean DEFAULT false,
  is_popular boolean DEFAULT false,
  is_available boolean DEFAULT true,
  is_visible boolean DEFAULT true,
  image_url text,
  sort_order integer DEFAULT 0,
  prep_time_minutes integer DEFAULT 15,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text NOT NULL,
  address text,
  city text,
  postal_code text,
  notes text,
  order_count integer DEFAULT 0,
  total_spent integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  order_type text NOT NULL CHECK (order_type IN ('delivery', 'takeaway', 'dine_in')),
  table_id uuid,
  status text NOT NULL DEFAULT 'new' CHECK (
    status IN ('new', 'accepted', 'preparing', 'ready', 'delivering', 'completed', 'cancelled', 'rejected')
  ),
  status_history jsonb DEFAULT '[]'::jsonb,
  delivery_address text,
  delivery_city text,
  delivery_postal_code text,
  delivery_notes text,
  delivery_fee integer DEFAULT 0,
  estimated_delivery_at timestamptz,
  subtotal integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'card_online', 'szep_card')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  customer_notes text,
  admin_notes text,
  placed_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  delivering_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  item_size text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price integer NOT NULL,
  total_price integer NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  capacity integer NOT NULL DEFAULT 4,
  position_x integer DEFAULT 0,
  position_y integer DEFAULT 0,
  status text DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'unavailable')),
  is_visible boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  areas text NOT NULL,
  delivery_fee integer NOT NULL DEFAULT 0,
  min_order_amount integer DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE business_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read business config" ON business_config FOR SELECT USING (true);
CREATE POLICY "Public can read visible categories" ON menu_categories FOR SELECT USING (is_visible = true);
CREATE POLICY "Public can read visible items" ON menu_items FOR SELECT USING (is_visible = true);
CREATE POLICY "Public can read delivery zones" ON delivery_zones FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read available tables" ON tables FOR SELECT USING (is_visible = true);

CREATE POLICY "Public can insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Public can insert order items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read order items" ON order_items FOR SELECT USING (true);
CREATE POLICY "Public can insert customers" ON customers FOR INSERT WITH CHECK (true);

ALTER TABLE orders ADD CONSTRAINT fk_orders_table FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL;

CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_slug ON menu_items(slug);
CREATE INDEX idx_menu_categories_slug ON menu_categories(slug);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_placed_at ON orders(placed_at DESC);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);

INSERT INTO business_config (
  business_name, tagline, phone, email, address, city, country,
  currency, currency_symbol, locale, delivery_enabled, takeaway_enabled,
  dine_in_enabled, table_management_enabled
) VALUES (
  'My Restaurant', 'Fresh food, delivered fast.', '', '', '', '', 'Hungary',
  'HUF', 'Ft', 'hu', true, true, false, false
);

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
