-- iCrystal.OS — Initial Schema v1

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";

-- Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  location text,
  specimen_count int not null default 0,
  follower_count int not null default 0,
  following_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Specimens
create table specimens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  mineral_name text not null,
  mineral_group text,
  variety text,
  locality text,
  locality_country text,
  -- True coordinates (visible only to owner)
  lat double precision,
  lng double precision,
  -- Obfuscated coordinates (public, ~10 km radius)
  obfuscated_lat double precision,
  obfuscated_lng double precision,
  location_precision int not null default 10,   -- km
  description text,
  crystal_system text,
  luster text,
  color text,
  hardness numeric(4,2),
  is_public boolean not null default true,
  quality_grade text not null default 'needs_id' check (quality_grade in ('needs_id','community','research')),
  ai_identified boolean not null default false,
  like_count int not null default 0,
  comment_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index specimens_user_id_idx on specimens(user_id);
create index specimens_public_idx on specimens(is_public, created_at desc);
create index specimens_location_idx on specimens(obfuscated_lat, obfuscated_lng) where is_public = true;

-- Specimen photos
create table specimen_photos (
  id uuid primary key default uuid_generate_v4(),
  specimen_id uuid not null references specimens(id) on delete cascade,
  storage_path text not null,
  url text not null,
  is_primary boolean not null default false,
  width int,
  height int,
  created_at timestamptz not null default now()
);

create index specimen_photos_specimen_idx on specimen_photos(specimen_id);

-- AI identifications log
create table ai_identifications (
  id uuid primary key default uuid_generate_v4(),
  specimen_id uuid references specimens(id) on delete set null,
  user_id uuid not null references profiles(id) on delete cascade,
  model text not null,
  top_candidates jsonb not null default '[]',
  selected_candidate jsonb,
  confidence numeric(5,4),
  created_at timestamptz not null default now()
);

-- Comments
create table comments (
  id uuid primary key default uuid_generate_v4(),
  specimen_id uuid not null references specimens(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index comments_specimen_idx on comments(specimen_id, created_at);

-- Likes
create table likes (
  specimen_id uuid not null references specimens(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (specimen_id, user_id)
);

-- Follows
create table follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

-- Notifications
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  type text not null check (type in ('comment','like','follow','identification')),
  specimen_id uuid references specimens(id) on delete cascade,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications(user_id, is_read, created_at desc);

-- =============================================================
-- Row Level Security
-- =============================================================

alter table profiles enable row level security;
alter table specimens enable row level security;
alter table specimen_photos enable row level security;
alter table ai_identifications enable row level security;
alter table comments enable row level security;
alter table likes enable row level security;
alter table follows enable row level security;
alter table notifications enable row level security;

-- Profiles
create policy "Profiles are public" on profiles for select using (true);
create policy "Users manage own profile" on profiles for all using (auth.uid() = id);

-- Specimens
create policy "Public specimens are visible" on specimens for select using (is_public = true or auth.uid() = user_id);
create policy "Authenticated users insert" on specimens for insert with check (auth.uid() = user_id);
create policy "Owners update" on specimens for update using (auth.uid() = user_id);
create policy "Owners delete" on specimens for delete using (auth.uid() = user_id);

-- Photos
create policy "Photos follow specimen visibility" on specimen_photos for select using (
  exists (select 1 from specimens s where s.id = specimen_id and (s.is_public = true or s.user_id = auth.uid()))
);
create policy "Owners insert photos" on specimen_photos for insert with check (
  exists (select 1 from specimens s where s.id = specimen_id and s.user_id = auth.uid())
);
create policy "Owners delete photos" on specimen_photos for delete using (
  exists (select 1 from specimens s where s.id = specimen_id and s.user_id = auth.uid())
);

-- Comments
create policy "Comments on public specimens" on comments for select using (
  exists (select 1 from specimens s where s.id = specimen_id and (s.is_public = true or s.user_id = auth.uid()))
);
create policy "Authenticated users comment" on comments for insert with check (auth.uid() = user_id);
create policy "Owners delete comments" on comments for delete using (auth.uid() = user_id);

-- Likes
create policy "Likes are public" on likes for select using (true);
create policy "Authenticated users like" on likes for insert with check (auth.uid() = user_id);
create policy "Users unlike" on likes for delete using (auth.uid() = user_id);

-- Follows
create policy "Follows are public" on follows for select using (true);
create policy "Authenticated users follow" on follows for insert with check (auth.uid() = follower_id);
create policy "Users unfollow" on follows for delete using (auth.uid() = follower_id);

-- Notifications
create policy "Users see own notifications" on notifications for select using (auth.uid() = user_id);
create policy "System inserts notifications" on notifications for insert with check (true);
create policy "Users mark read" on notifications for update using (auth.uid() = user_id);

-- AI identifications
create policy "Users see own AI IDs" on ai_identifications for select using (auth.uid() = user_id);
create policy "Authenticated users insert" on ai_identifications for insert with check (auth.uid() = user_id);

-- =============================================================
-- Functions & Triggers
-- =============================================================

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Obfuscate location on insert/update
create or replace function obfuscate_location()
returns trigger language plpgsql as $$
declare
  radius_deg double precision;
begin
  if new.lat is not null and new.lng is not null then
    radius_deg := new.location_precision / 111.0;
    new.obfuscated_lat := new.lat + (random() - 0.5) * 2 * radius_deg;
    new.obfuscated_lng := new.lng + (random() - 0.5) * 2 * radius_deg;
  end if;
  return new;
end;
$$;

create trigger obfuscate_location_trigger
  before insert or update of lat, lng, location_precision on specimens
  for each row execute function obfuscate_location();

-- Update specimen counts
create or replace function update_specimen_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update profiles set specimen_count = specimen_count + 1 where id = new.user_id;
  elsif TG_OP = 'DELETE' then
    update profiles set specimen_count = greatest(0, specimen_count - 1) where id = old.user_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger specimen_count_trigger
  after insert or delete on specimens
  for each row execute function update_specimen_count();

-- Update like counts
create or replace function update_like_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update specimens set like_count = like_count + 1 where id = new.specimen_id;
  elsif TG_OP = 'DELETE' then
    update specimens set like_count = greatest(0, like_count - 1) where id = old.specimen_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger like_count_trigger
  after insert or delete on likes
  for each row execute function update_like_count();

-- Update comment counts
create or replace function update_comment_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update specimens set comment_count = comment_count + 1 where id = new.specimen_id;
  elsif TG_OP = 'DELETE' then
    update specimens set comment_count = greatest(0, comment_count - 1) where id = old.specimen_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger comment_count_trigger
  after insert or delete on comments
  for each row execute function update_comment_count();

-- Update follow counts
create or replace function update_follow_counts()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update profiles set following_count = following_count + 1 where id = new.follower_id;
    update profiles set follower_count = follower_count + 1 where id = new.following_id;
  elsif TG_OP = 'DELETE' then
    update profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
    update profiles set follower_count = greatest(0, follower_count - 1) where id = old.following_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger follow_count_trigger
  after insert or delete on follows
  for each row execute function update_follow_counts();
