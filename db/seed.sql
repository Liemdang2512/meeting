-- Seed: tạo admin user mặc định
-- Email: admin@local.dev | Password: admin123
-- Chạy sau db:reset: npm run db:seed

INSERT INTO auth.users (id, email, password_hash, created_at)
VALUES (
  gen_random_uuid(),
  'admin@local.dev',
  '$2a$12$dwXHFb3yINXjGrbaa6I3yuq/B9e09NZjGYDt419tu.wYQHKLK2SRy',
  NOW()
)
ON CONFLICT DO NOTHING
RETURNING id;

INSERT INTO public.profiles (user_id, role, created_at, updated_at)
SELECT id, 'admin', NOW(), NOW()
FROM auth.users
WHERE email = 'admin@local.dev'
ON CONFLICT (user_id) DO NOTHING;
