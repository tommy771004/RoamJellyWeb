CREATE TABLE IF NOT EXISTS user_ai_profiles (
  user_id varchar(128) PRIMARY KEY REFERENCES users(user_id),
  preferred_departure varchar(255),
  preferred_companions varchar(64),
  preferred_vibes jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferred_interests jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferred_dietary jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferred_transport jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferred_budget varchar(64),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);