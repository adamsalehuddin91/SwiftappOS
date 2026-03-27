
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Projects Table
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  status text not null default 'Drafting' check (status in ('Drafting', 'Dev', 'UAT', 'Live')),
  sow_details text,
  client_name text,
  client_email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Milestones Table
create table public.milestones (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  description text,
  status text not null default 'Pending' check (status in ('Pending', 'In Progress', 'Completed', 'Invoiced', 'Paid')),
  amount numeric(10, 2) not null default 0.00,
  due_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Quotations Table
create table public.quotations (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete set null,
  quotation_number text not null unique,
  client_name text not null,
  client_email text,
  items jsonb not null default '[]'::jsonb, -- Storing items as JSON for simplicity in this version
  total_amount numeric(10, 2) not null default 0.00,
  status text not null default 'Draft' check (status in ('Draft', 'Sent', 'Accepted', 'Rejected')),
  valid_until date,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Invoices Table
create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  milestone_id uuid references public.milestones(id) on delete set null,
  invoice_number text not null unique,
  type text not null check (type in ('Deposit', 'Progress', 'Final')),
  amount numeric(10, 2) not null default 0.00,
  status text not null default 'Draft' check (status in ('Draft', 'Sent', 'Paid', 'Void')),
  due_date date,
  items jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Receipts Table
create table public.receipts (
  id uuid default uuid_generate_v4() primary key,
  invoice_id uuid references public.invoices(id) on delete cascade not null,
  receipt_number text not null unique,
  amount_paid numeric(10, 2) not null,
  payment_method text,
  payment_date date default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.projects enable row level security;
alter table public.milestones enable row level security;
alter table public.quotations enable row level security;
alter table public.invoices enable row level security;
alter table public.receipts enable row level security;

-- Create Policies (Allow all for internal use, restrict as needed)
create policy "Allow all access to authenticated users" on public.projects for all using (auth.role() = 'authenticated');
create policy "Allow all access to authenticated users" on public.milestones for all using (auth.role() = 'authenticated');
create policy "Allow all access to authenticated users" on public.quotations for all using (auth.role() = 'authenticated');
create policy "Allow all access to authenticated users" on public.invoices for all using (auth.role() = 'authenticated');
create policy "Allow all access to authenticated users" on public.receipts for all using (auth.role() = 'authenticated');
