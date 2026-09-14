-- Dinner Tracker — one-time seed data.
--
-- Run this AFTER schema.sql, once, in the Supabase SQL Editor. It creates the
-- one household, the two members (Eric, Sarah), and a starter recipe
-- collection so the week generator has something to work with before any
-- real dinners are logged. It does NOT set the sign-in password — run
-- `npm run set-password -- "your password"` locally for that (it never
-- touches this file, so the plaintext password is never committed anywhere).
--
-- Safe to run once. Re-running will create a second household — if you need
-- to start over, delete the household row (cascades to everything else)
-- before re-running.

with new_household as (
  insert into households (name)
  values ('Eric & Sarah''s kitchen')
  returning id
),
new_users as (
  insert into users (household_id, name, email, avatar_color, default_log_screen)
  select id, u.name, u.email, u.avatar_color, 'Quick add'
  from new_household, (values
    ('Eric', 'ehanson2@gmail.com', 'accent'),
    ('Sarah', null, 'accent-2')
  ) as u(name, email, avatar_color)
  returning id, name
)
insert into recipes (household_id, name, protein, cuisine, tags, origin)
select id, r.name, r.protein, r.cuisine, r.tags, 'Seed recipe'
from new_household, (values
  ('Sheet-Pan Chicken Fajitas', 'Chicken', 'Mexican', array['Chicken','Mexican']),
  ('Shrimp Scampi',             'Shrimp',  'Italian', array['Shrimp','Italian']),
  ('Weeknight Beef Chili',      'Beef',    'Mexican', array['Beef','Mexican']),
  ('Pork Carnitas',             'Pork',    'Mexican', array['Pork','Mexican']),
  ('Spaghetti and Meatballs',   'Beef',    'Italian', array['Beef','Italian']),
  ('Chicken Parmesan',          'Chicken', 'Italian', array['Chicken','Italian']),
  ('Shrimp Tacos',              'Shrimp',  'Mexican', array['Shrimp','Mexican']),
  ('Black-Eyed Pea Skillet',    'Veg',     'Southern', array['Veg','Southern']),
  ('Honey Garlic Pork Chops',   'Pork',    'Southern', array['Pork','Southern']),
  ('Veggie Stir-Fry',           'Veg',     null,       array['Veg'])
) as r(name, protein, cuisine, tags);
