# First Baptist Church — Pinedale, Wyoming
**Website for 646 N Tyler Ave, Pinedale, WY 82941**

A complete, modern, professional church website built with Next.js 16, Tailwind, and Supabase. Warm, welcoming design with earthy navy, gold, and Wyoming mountain accents.

## Pastors
- Lead: Ted & Teresa York
- Assistant/Youth: Heath & Tessa Holmes

---

## Quick Start (Local Development)

```bash
cd ~/first-baptist-pinedale

# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env.local

# 3. Add your Supabase credentials to .env.local (see below)

# 4. Run the dev server
npm run dev
```

Open http://localhost:3000

---

## Supabase Setup (Required for Login, Admin, Uploads, etc.)

This site uses Supabase for authentication, database, and image storage. Follow these steps once:

### 1. Create a Supabase Project
- Go to https://supabase.com and create a free project
- Wait ~2 minutes for it to provision

### 2. Get Your Keys
In Supabase Dashboard → Project Settings → API:
- Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Paste them into `.env.local`

### 3. Run the Database Schema
Go to Supabase → SQL Editor → New Query, paste the entire contents of `supabase/schema.sql` (or copy the schema below), and click **Run**.

### 4. Create Storage Buckets (for photos & uploads)
In Supabase Dashboard → Storage:
Create the following public buckets:
- `building-photos`
- `sermons`
- `youth-photos`
- `member-photos`

For each bucket, set these policies (or make them public for development):
- `INSERT`: authenticated users (admins)
- `SELECT`: public (for photos to show on site)

### 5. Enable Email + Password Auth
Supabase → Authentication → Providers → Email → Enable

### 6. Create Your First Admin Account
After the site is running:
1. Go to `/login`
2. Create an account using the email you want to be admin
3. In Supabase → Table Editor → `profiles` table:
   - Find the new row
   - Change `role` from `pending` to `admin`
4. Refresh the site and log in — you now have full admin access

---

## Database Schema (Copy into Supabase SQL Editor)

```sql
-- Profiles (auth.users + role)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  role text default 'pending' check (role in ('pending','approved','admin')),
  photo_url text,
  phone text,
  address text,
  joined_date date,
  created_at timestamptz default now()
);

-- Sermons
create table sermons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  preacher text not null,
  date date not null,
  video_url text not null,
  thumbnail_url text not null,
  description text,
  created_at timestamptz default now()
);

-- Building photos
create table building_photos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caption text,
  uploaded_at timestamptz default now()
);

-- Building progress (single row)
create table building_progress (
  id int primary key default 1,
  physical_percent int default 0,
  funds_raised numeric default 250000,
  funds_goal numeric default 451000,
  updated_at timestamptz default now()
);

-- Events
create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  time text,
  description text,
  location text,
  image_url text,
  created_at timestamptz default now()
);

-- Enable Row Level Security (recommended)
alter table profiles enable row level security;
-- Add policies as needed for production
```

---

## Zeffy Giving Integration

The `/give` page contains a live Zeffy donation form. To update the form:

1. Log into your Zeffy account
2. Go to your donation form → Embed
3. Copy the new embed URL
4. Update the `src` in `app/give/page.tsx`

---

## Key Pages

- `/` — Beautiful home with hero, service times, sermon teaser
- `/give` — Zeffy giving with 4 funds
- `/admin` — Full drag-and-drop beginner-friendly dashboard (pastors only)
- `/admin/quick-guide` — One-page printable pastor cheat sheet
- `/members/directory` — Private Member Directory (Google Doc embed)
- `/prayer-bulletin` — Prayer Bulletin (Google Doc embed)

---

## Design Notes

Colors: Deep navy (#1a365d), warm gold (#c5a46e), sage, cream backgrounds.
Fonts: Inter + Playfair Display (serif headings for that classic church feel).
Fully responsive, mobile-first, fast.

---

## Deploying to Production

Recommended: Vercel (zero-config with Next.js)

1. Push this repo to GitHub
2. Import into Vercel
3. Add the same Supabase env vars in Vercel dashboard
4. Deploy

---

## Questions / Customization

This project was built to be extremely easy for a non-technical pastor or admin to manage after the initial Supabase setup. All image uploads, progress updates, sermon additions, and approvals are done through the big-button `/admin` dashboard.

For any help or future features, contact the builder or open an issue.

*"For where two or three gather in my name, there am I with them."* — Matthew 18:20

---

**Address:** 646 N Tyler Ave, Pinedale, WY 82941
**Phone:** (307) 367-4567
