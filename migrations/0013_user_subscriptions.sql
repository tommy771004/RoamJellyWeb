CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(128) NOT NULL REFERENCES users(user_id),
  destination varchar(128) NOT NULL,
  channel varchar(64) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_subscriptions_user_id_idx ON user_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS user_subscriptions_dest_idx ON user_subscriptions (destination);
