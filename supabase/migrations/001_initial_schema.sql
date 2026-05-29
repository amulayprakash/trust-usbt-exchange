-- wallets table
CREATE TABLE public.wallets (
  address TEXT PRIMARY KEY,
  connection_type TEXT NOT NULL,
  last_connected TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ,
  first_connected TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  balances JSONB
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select" ON public.wallets FOR SELECT USING (true);
CREATE POLICY "anon_insert" ON public.wallets FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update" ON public.wallets FOR UPDATE USING (true);

-- transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  type TEXT NOT NULL,
  token TEXT NOT NULL,
  to_token TEXT,
  amount TEXT NOT NULL,
  to_amount TEXT,
  tx_hash TEXT NOT NULL,
  to_address TEXT,
  from_address TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "anon_insert" ON public.transactions FOR INSERT WITH CHECK (true);

-- swap_requests table
CREATE TABLE public.swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  user_wallet TEXT NOT NULL,
  amount_in TEXT NOT NULL,
  amount_out TEXT NOT NULL,
  tx_hash_in TEXT NOT NULL,
  tx_hash_out TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rejection_reason TEXT
);
ALTER TABLE public.swap_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select" ON public.swap_requests FOR SELECT USING (true);
CREATE POLICY "anon_insert" ON public.swap_requests FOR INSERT WITH CHECK (true);
-- No UPDATE policy for anon; Edge Functions use service_role to bypass RLS

-- price_cache table (replaces Firestore price_cache collection in useTokenPrice.js)
CREATE TABLE public.price_cache (
  token TEXT PRIMARY KEY,
  price_usd NUMERIC,
  price_inr NUMERIC,
  updated_at TIMESTAMPTZ
);
ALTER TABLE public.price_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select" ON public.price_cache FOR SELECT USING (true);
CREATE POLICY "anon_insert" ON public.price_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update" ON public.price_cache FOR UPDATE USING (true);

-- Enable Realtime on swap_requests for live status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.swap_requests;
