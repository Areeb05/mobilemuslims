-- Subscriptions table for PFS purchases
create table subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_type text not null check (plan_type in ('monthly', 'lifetime')),
  status text not null check (status in ('active', 'cancelled', 'expired')),
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone,
  unique(user_id)
);

-- Enable RLS
alter table subscriptions enable row level security;

-- Users can only read their own subscription
create policy "Users can view own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- Server can insert/update subscriptions (via service role key)
create policy "Service role can manage subscriptions"
  on subscriptions for all
  using (true)
  with check (true);
