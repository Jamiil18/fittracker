import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// PGlite is the real Postgres engine compiled to WebAssembly, so the migrations
// run exactly as written, without Docker or a hosted project. Supabase creates
// a few things before any migration runs; these stand-ins copy the parts our
// migrations rely on:
// - the anon and authenticated roles that API requests run as
// - auth.users, and auth.uid(), which reads the signed-in user's id from the
//   request's JWT claims the same way Supabase's version does
// - storage.buckets, storage.objects and storage.foldername(), which the
//   initial schema's photo bucket and policies use, and the trigger that
//   blocks deleting from storage tables with SQL, which the migration
//   removing photos has to lift
// - the default grants Supabase gives both roles on the public schema, so the
//   migration's own revokes are tested too
const supabaseStandIns = `
  create role anon nologin;
  create role authenticated nologin;

  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', ''
    )::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;

  create schema storage;
  create table storage.buckets (
    id text primary key, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id), name text
  );
  create function storage.protect_delete() returns trigger language plpgsql as $$
  begin
    if coalesce(current_setting('storage.allow_delete_query', true), 'false') <> 'true' then
      raise exception 'Direct deletion from storage tables is not allowed.';
    end if;
    return old;
  end;
  $$;
  create trigger protect_buckets_delete before delete on storage.buckets
    for each row execute function storage.protect_delete();
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
  $$;
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated;
  grant all on all tables in schema storage to anon, authenticated;

  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`;

const migrationsDirectory = path.join(__dirname, '..', 'migrations');

type Role = 'postgres' | 'authenticated' | 'anon';
type Row = Record<string, unknown>;

export type TestDatabase = {
  // Runs as the database owner, bypassing RLS, like the Supabase dashboard.
  asAdmin: (sql: string) => Promise<Row[]>;
  // Runs as a signed-in user making an API request.
  asUser: (userId: string, sql: string) => Promise<Row[]>;
  // Runs as a signed-out API request.
  asAnon: (sql: string) => Promise<Row[]>;
  createUser: (userId: string) => Promise<void>;
  close: () => Promise<void>;
};

export async function createTestDatabase(): Promise<TestDatabase> {
  const db = new PGlite();
  await db.exec(supabaseStandIns);

  const migrationFiles = readdirSync(migrationsDirectory)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  for (const file of migrationFiles) {
    await db.exec(readFileSync(path.join(migrationsDirectory, file), 'utf8'));
  }

  // Returns the rows of the last statement, so a test can run setup
  // statements and a final select in one call.
  async function run(role: Role, userId: string | null, sql: string): Promise<Row[]> {
    const claims = userId ? JSON.stringify({ sub: userId, role }) : '';
    await db.query(`select set_config('request.jwt.claims', $1, false)`, [claims]);
    await db.exec(`set role ${role}`);
    try {
      const results = await db.exec(sql);
      return (results.at(-1)?.rows ?? []) as Row[];
    } finally {
      await db.exec('reset role');
    }
  }

  return {
    asAdmin: (sql) => run('postgres', null, sql),
    asUser: (userId, sql) => run('authenticated', userId, sql),
    asAnon: (sql) => run('anon', null, sql),
    createUser: async (userId) => {
      await db.query('insert into auth.users (id, email) values ($1, $2)', [
        userId,
        `${userId}@example.test`,
      ]);
    },
    close: () => db.close(),
  };
}
