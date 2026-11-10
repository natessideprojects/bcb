import postgres from 'postgres';
if(!process.env.DATABASE_URL) throw Error('DATABASE_URL is missing');
const sql=postgres(process.env.DATABASE_URL,{ssl:{rejectUnauthorized:true},max:1,prepare:false,connect_timeout:20});
try{
  await sql`
    CREATE TABLE IF NOT EXISTS bcb_rooms (
      id uuid PRIMARY KEY,
      code text NOT NULL UNIQUE,
      host_id text NOT NULL,
      player_ids text[] NOT NULL,
      status text NOT NULL DEFAULT 'lobby' CHECK(status IN ('lobby','playing','finished','closed')),
      revision integer NOT NULL DEFAULT 1,
      state jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS bcb_rooms_members_idx ON bcb_rooms USING gin(player_ids)`;
  await sql`CREATE TABLE IF NOT EXISTS bcb_limits (key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL)`;
  await sql`CREATE TABLE IF NOT EXISTS bcb_profiles (
    user_id text PRIMARY KEY, driver_name text NOT NULL, is_test boolean NOT NULL DEFAULT false,
    earned_tickets integer NOT NULL DEFAULT 0, wallet integer NOT NULL DEFAULT 0,
    races integer NOT NULL DEFAULT 0, wins integer NOT NULL DEFAULT 0,
    bashes integer NOT NULL DEFAULT 0, doubles integer NOT NULL DEFAULT 0,
    laps integer NOT NULL DEFAULT 0, best_score integer NOT NULL DEFAULT 0,
    points integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS bcb_results (
    room_id uuid NOT NULL REFERENCES bcb_rooms(id), user_id text NOT NULL,
    score integer NOT NULL, reward integer NOT NULL, won boolean NOT NULL,
    bashes integer NOT NULL, doubles integer NOT NULL, laps integer NOT NULL,
    rounds integer NOT NULL, points integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(room_id,user_id)
  )`;
  await sql`CREATE INDEX IF NOT EXISTS bcb_rankings_idx ON bcb_profiles(points DESC,wins DESC,earned_tickets DESC)`;
  console.log('Private rooms, profiles, results and indexes are ready.');
}finally{await sql.end();}
