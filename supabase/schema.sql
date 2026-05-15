create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bakeries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text,
  phone text,
  address text,
  pickup_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid references public.bakeries(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  price integer not null check (price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  inventory_category text not null default 'pre_order' check (inventory_category in ('fresh_today', 'leftover_stock', 'frozen', 'pre_order')),
  is_ready_now boolean not null default false,
  pickup_ready_minutes integer not null default 0 check (pickup_ready_minutes in (0, 15, 60)),
  low_stock_threshold integer not null default 4 check (low_stock_threshold >= 0),
  active boolean not null default true,
  badge text,
  accent text default '#9b4d24',
  image_url text,
  gallery_images text[] not null default '{}',
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  bakery_id uuid references public.bakeries(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_address text,
  fulfillment_method text not null default 'delivery' check (fulfillment_method in ('delivery', 'pickup')),
  delivery_day text,
  production_date date,
  pickup_ready_at timestamptz,
  notes text,
  status text not null default 'received' check (
    status in ('received', 'preparing', 'baking', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled')
  ),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  refund_status text not null default 'not_required' check (refund_status in ('not_required', 'pending', 'refunded', 'failed')),
  cancelled_by text check (cancelled_by in ('customer', 'bakery')),
  cancellation_reason text,
  cancelled_at timestamptz,
  total integer not null default 0 check (total >= 0),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total integer not null check (line_total >= 0),
  is_custom_box boolean not null default false,
  box_name text,
  custom_box_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.custom_boxes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  customer_email text not null,
  name text not null,
  items jsonb not null default '[]'::jsonb,
  weekdays text[] not null default '{}',
  min_items integer not null default 4,
  max_items integer not null default 12,
  total integer not null default 0,
  order_mode text not null default 'one_time' check (order_mode in ('one_time', 'subscription')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  movement_type text not null check (movement_type in ('restock', 'sale', 'adjustment')),
  quantity_delta integer not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_audit_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_type text not null check (actor_type in ('customer', 'bakery', 'system')),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  from_status text,
  to_status text,
  from_refund_status text,
  to_refund_status text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  bakery_id uuid references public.bakeries(id) on delete set null,
  customer_email text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  cadence text not null default 'weekly' check (cadence in ('weekly', 'monthly')),
  weekdays text[] not null default '{}',
  product_ids uuid[] not null default '{}',
  skipped_dates date[] not null default '{}',
  paused_dates date[] not null default '{}',
  stripe_subscription_id text unique,
  next_order_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.bakeries enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.custom_boxes enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.order_audit_log enable row level security;
alter table public.subscriptions enable row level security;

alter table public.orders add column if not exists production_date date;
alter table public.orders add column if not exists pickup_ready_at timestamptz;
alter table public.orders add column if not exists refund_status text not null default 'not_required';
alter table public.orders add column if not exists cancelled_by text;
alter table public.orders add column if not exists cancellation_reason text;
alter table public.orders add column if not exists cancelled_at timestamptz;
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (
  status in ('received', 'preparing', 'baking', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled')
);
alter table public.orders drop constraint if exists orders_refund_status_check;
alter table public.orders add constraint orders_refund_status_check check (
  refund_status in ('not_required', 'pending', 'refunded', 'failed')
);
alter table public.orders drop constraint if exists orders_cancelled_by_check;
alter table public.orders add constraint orders_cancelled_by_check check (
  cancelled_by in ('customer', 'bakery') or cancelled_by is null
);
alter table public.products add column if not exists inventory_category text not null default 'pre_order';
alter table public.products add column if not exists is_ready_now boolean not null default false;
alter table public.products add column if not exists pickup_ready_minutes integer not null default 0;
alter table public.products add column if not exists low_stock_threshold integer not null default 4;
alter table public.products add column if not exists gallery_images text[] not null default '{}';
alter table public.subscriptions add column if not exists weekdays text[] not null default '{}';
alter table public.subscriptions add column if not exists product_ids uuid[] not null default '{}';
alter table public.subscriptions add column if not exists skipped_dates date[] not null default '{}';
alter table public.subscriptions add column if not exists paused_dates date[] not null default '{}';
alter table public.order_items add column if not exists is_custom_box boolean not null default false;
alter table public.order_items add column if not exists box_name text;
alter table public.order_items add column if not exists custom_box_id uuid;
alter table public.products drop constraint if exists products_inventory_category_check;
alter table public.products add constraint products_inventory_category_check check (
  inventory_category in ('fresh_today', 'leftover_stock', 'frozen', 'pre_order')
);
alter table public.products drop constraint if exists products_pickup_ready_minutes_check;
alter table public.products add constraint products_pickup_ready_minutes_check check (
  pickup_ready_minutes in (0, 15, 60)
);

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create policy "Public can read active products"
  on public.products for select
  using (active = true or public.is_admin());

create policy "Admins manage products"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Customers can read own profile"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "Admins manage all profiles"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins read bakeries"
  on public.bakeries for select
  using (public.is_admin());

create policy "Admins manage bakeries"
  on public.bakeries for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Customers read matching orders"
  on public.orders for select
  using (profile_id = auth.uid() or public.is_admin());

create policy "Admins manage orders"
  on public.orders for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Customers read own order items"
  on public.order_items for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.orders
      where orders.id = order_items.order_id and orders.profile_id = auth.uid()
    )
  );

create policy "Admins manage order items"
  on public.order_items for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Customers read saved custom boxes"
  on public.custom_boxes for select
  using (profile_id = auth.uid() or public.is_admin());

create policy "Admins manage custom boxes"
  on public.custom_boxes for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins manage inventory"
  on public.inventory_movements for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Customers read own audit log"
  on public.order_audit_log for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.orders
      where orders.id = order_audit_log.order_id and orders.profile_id = auth.uid()
    )
  );

create policy "Admins manage audit log"
  on public.order_audit_log for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Customers read own subscriptions"
  on public.subscriptions for select
  using (profile_id = auth.uid() or public.is_admin());

create policy "Admins manage subscriptions"
  on public.subscriptions for all
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.bakeries (name, email, phone, address, pickup_instructions)
values ('My Gluten Free Bakery', 'info@mygfbakery.co.uk', '0800 2461102', '6 Print Village, 58 Chadwick Road, London, SE15 4PU', 'Store collection is available from the South London bakery.')
on conflict do nothing;

insert into public.products (name, slug, description, price, stock_quantity, inventory_category, is_ready_now, pickup_ready_minutes, low_stock_threshold, active, badge, accent, image_url, gallery_images, sort_order, metadata)
values
  ('Boss Bagels', 'boss-bagels', 'Chunky, chewy gluten-free sourdough bagels, glazed with golden syrup and finished with chia seeds.', 449, 24, 'fresh_today', true, 0, 4, true, 'Bestseller', '#c08a2d', '/assets/Boss_Bagels_Stack.webp', array['/assets/Boss_Bagels_Stack.webp','/assets/Boss_Bagels_Detail.webp'], 1, '{"shortName":"Pack of 4","category":"Bagels","includes":["Pack of 4 bagels","Chia seed finish","Vegan friendly","Free from gluten, dairy, egg, nuts and soya"]}'),
  ('Super Sourdough', 'super-sourdough', 'The bakery’s most popular loaf: a bold, tangy gluten-free sourdough with a firm crisp crust.', 475, 18, 'fresh_today', true, 15, 4, true, 'Customer favourite', '#835832', '/assets/Super_Sourdough-06.webp', array['/assets/Super_Sourdough-06.webp'], 2, '{"shortName":"Gluten free sourdough loaf","category":"Loaves","includes":["Slow-fermented sourdough","Crisp crust","Available sliced or unsliced","Suitable for freezing"]}'),
  ('Totally Seeded', 'totally-seeded', 'A seeded gluten-free sourdough loaf with a hearty crumb and proper bakery flavour.', 475, 18, 'fresh_today', true, 15, 4, true, '5.0 rated', '#6d7e42', '/assets/TotallySeededWhole.webp', array['/assets/TotallySeededWhole.webp','/assets/TotallySeededSliced.webp'], 3, '{"shortName":"Seeded sourdough loaf","category":"Loaves","includes":["Seeded loaf","Teff sourdough style","Vegan friendly","Free from major allergens"]}'),
  ('Tinned Sandwich Loaf', 'tinned-sandwich-loaf', 'A fluffy structured gluten-free sandwich loaf, sliced and made for toast, sandwiches, and freezing.', 569, 16, 'fresh_today', true, 0, 4, true, 'Everyday staple', '#d2a148', '/assets/Tinned_Loaf-01.webp', array['/assets/Tinned_Loaf-01.webp','/assets/Tinned_Loaf-09.webp'], 4, '{"shortName":"Sliced everyday loaf","category":"Loaves","includes":["Sliced loaf","Structured tin shape","Vegan friendly","No added sugar"]}'),
  ('Classic Bagels', 'classic-bagels', 'Award-winning plain gluten-free sourdough bagels with a soft, chewy texture and balanced flavour.', 449, 24, 'fresh_today', true, 0, 4, true, 'Award-winning', '#e0a13c', '/assets/Classic_Bagels.webp', array['/assets/Classic_Bagels.webp','/assets/Bagels_Multipack-01.webp'], 5, '{"shortName":"Pack of 4","category":"Bagels","includes":["Pack of 4 bagels","2024 Free From Award Gold Winner","Sourdough starter","Vegan friendly"]}'),
  ('Nigella Seed and Garlic Bagels', 'nigella-garlic-bagels', 'A savoury gluten-free sourdough bagel with nigella seed and garlic for a bigger, bolder bite.', 565, 16, 'fresh_today', true, 0, 4, true, 'Savoury favourite', '#4f6f57', '/assets/GAarlic_Nigella-15.webp', array['/assets/GAarlic_Nigella-15.webp','/assets/GAarlic_Nigella-17.webp'], 6, '{"shortName":"Pack of 5","category":"Bagels","includes":["Pack of 5 bagels","Nigella seeds","Garlic finish","Vegan friendly"]}'),
  ('Bagel Selection Box', 'bagel-selection-box', 'A mixed box of gluten-free sourdough bagels, ideal for trying different flavours and stocking the freezer.', 935, 12, 'pre_order', false, 60, 3, true, 'Mixed box', '#b76832', '/assets/Bagels_Multipack-01.webp', array['/assets/Bagels_Multipack-01.webp','/assets/Classic_Bagels.webp','/assets/Boss_Bagels_Stack.webp'], 7, '{"shortName":"Mixed bagel box","category":"Boxes & Bundles","includes":["Boss Bagels","Classic Bagels","Seasonal bagel styles","Freezer friendly"]}'),
  ('Mixed Bread Box', 'loaves-mixed-box', 'A curated selection of four gluten-free sourdough loaves: Super Sourdough, Totes Oats, Totally Seeded and Tinned Sandwich Loaf.', 1899, 10, 'pre_order', false, 60, 3, true, 'Better value', '#7d5f3a', '/assets/Bread_Multipack-1.webp', array['/assets/Bread_Multipack-1.webp','/assets/Super_Sourdough-06.webp','/assets/TotallySeededWhole.webp'], 8, '{"shortName":"4 gluten-free loaves","category":"Boxes & Bundles","includes":["Super Sourdough","Totes Oats","Totally Seeded","Tinned Sandwich Loaf"]}'),
  ('Brilliant Baguette', 'baguette', 'A crusty gluten-free baguette for dinner tables, sandwiches, garlic bread, and tearing warm from the oven.', 289, 20, 'fresh_today', true, 15, 4, true, 'Fresh from the oven', '#b67b30', '/assets/Baguette-5.jpg', array['/assets/Baguette-5.jpg','/assets/Baguette-2.jpg','/assets/Baguette-3.jpg'], 9, '{"shortName":"Gluten free sourdough baguette","category":"Loaves","includes":["Crusty baguette","Vegan friendly","Freezer friendly","Fresh to order"]}'),
  ('Build-a-Box', 'build-a-box', 'A flexible bundle inspired by My Gluten Free Bakery’s build-a-box range. Mix loaves and bagels to stock up and save.', 1599, 14, 'pre_order', false, 60, 3, true, 'Stock up & save', '#2f7465', '/assets/Breakfast-Edit-Yumbles.webp', array['/assets/Breakfast-Edit-Yumbles.webp','/assets/Bread_Multipack-1.webp','/assets/Bagels_Multipack-01.webp'], 10, '{"shortName":"Mix. Match. Munch.","category":"Boxes & Bundles","includes":["Choose bagels","Choose loaves","Bundle value","Free UK delivery over £35"]}')
on conflict (slug) do nothing;
