import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const gymA = "00000000-0000-4000-8000-00000000000a";
const gymB = "00000000-0000-4000-8000-00000000000b";
const userA = "00000000-0000-4000-8000-000000000001";
const ownerA = "00000000-0000-4000-8000-000000000002";
const ownerB = "00000000-0000-4000-8000-000000000003";

async function as(db, role, userId, sql) {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role");
  }
}

test("actual Postgres grants + RLS prevent cross-gym privilege escalation", async () => {
  const db = new PGlite();
  try {
    // Small local fixture reproduces the security-bearing parts of 0001,
    // 0055 and 0062. Run the exact new migration after proving the old path.
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      create table public.gimnasios (id uuid primary key, nombre text);
      create table public.profiles (
        id uuid primary key, gimnasio_id uuid not null references gimnasios(id),
        rol text not null check (rol in ('dueno', 'cliente', 'staff')),
        dni text, nombre text, telefono text, debe_cambiar_clave boolean default true,
        email_recuperacion text, activo boolean default true, permisos jsonb default '{}',
        tyc_aceptado_en timestamptz, creado_at timestamptz default now()
      );
      create table public.clientes (id uuid primary key, gimnasio_id uuid not null, dato_privado text);
      insert into gimnasios values
        ('${gymA}', 'A'), ('${gymB}', 'B');
      insert into profiles (id, gimnasio_id, rol, nombre) values
        ('${userA}', '${gymA}', 'cliente', 'A'),
        ('${ownerA}', '${gymA}', 'dueno', 'Dueño A'),
        ('${ownerB}', '${gymB}', 'dueno', 'Dueño B');
      insert into clientes values ('00000000-0000-4000-8000-000000000099', '${gymB}', 'privado B');
      create function public.current_gimnasio_id() returns uuid language sql stable
        security definer set search_path = public as $$
        select gimnasio_id from profiles where id = auth.uid()
      $$;
      create function public.is_dueno() returns boolean language sql stable
        security definer set search_path = public as $$
        select exists(select 1 from profiles where id = auth.uid() and rol = 'dueno')
      $$;
      alter table profiles enable row level security;
      alter table clientes enable row level security;
      create policy prof_select on profiles for select to authenticated
        using (id = auth.uid() or (gimnasio_id = current_gimnasio_id() and is_dueno()));
      create policy prof_update on profiles for update to authenticated
        using ((gimnasio_id = current_gimnasio_id() and is_dueno()) or id = auth.uid())
        with check ((gimnasio_id = current_gimnasio_id() and is_dueno()) or id = auth.uid());
      create policy clientes_select on clientes for select to authenticated
        using (gimnasio_id = current_gimnasio_id() and is_dueno());
      grant usage on schema public, auth to authenticated, service_role;
      grant execute on all functions in schema public, auth to authenticated;
      grant select, update on profiles to authenticated;
      grant select on clientes to authenticated;
      grant select on gimnasios to authenticated;
      grant select, update on profiles to service_role;
    `);

    // Reproduce the vulnerability, then undo the test mutation before fixing.
    await as(db, "authenticated", userA, `update profiles set gimnasio_id = '${gymB}', rol = 'dueno' where id = '${userA}'`);
    const leaked = await as(db, "authenticated", userA, "select dato_privado from clientes");
    assert.deepEqual(leaked.rows, [{ dato_privado: "privado B" }]);
    await db.exec(`update profiles set gimnasio_id = '${gymA}', rol = 'cliente' where id = '${userA}'`);

    const migration = await readFile(new URL("../../supabase/migrations/0072_profiles_authorization_columns.sql", import.meta.url), "utf8");
    await db.exec(migration);

    for (const attemptedColumn of [
      `gimnasio_id = '${gymB}'`, "rol = 'dueno'", "activo = false",
      `permisos = '{"admin":true}'`, `id = '${ownerB}'`, "dni = '123'",
      "tyc_aceptado_en = now()", "creado_at = now()",
    ]) {
      await assert.rejects(
        as(db, "authenticated", userA, `update profiles set ${attemptedColumn} where id = '${userA}'`),
        /permission denied/i,
        attemptedColumn,
      );
    }
    const safeUpdate = await as(db, "authenticated", userA,
      `update profiles set debe_cambiar_clave = false where id = '${userA}' returning id`);
    assert.equal(safeUpdate.rows.length, 1);
    const otherUpdate = await as(db, "authenticated", userA,
      `update profiles set debe_cambiar_clave = false where id = '${ownerB}' returning id`);
    assert.equal(otherUpdate.rows.length, 0);
    await assert.rejects(
      as(db, "authenticated", ownerA, `update profiles set gimnasio_id = '${gymB}' where id = '${ownerA}'`),
      /permission denied/i,
    );
    const ownerEmail = await as(db, "authenticated", ownerA,
      `update profiles set email_recuperacion = 'owner@example.com' where id = '${ownerA}' returning id`);
    assert.equal(ownerEmail.rows.length, 1);
    const noLeak = await as(db, "authenticated", userA, "select dato_privado from clientes");
    assert.equal(noLeak.rows.length, 0);

    // Owner operations on staff/socios are performed by existing checked
    // server actions with service_role; that path still writes the full row.
    await as(db, "service_role", ownerA,
      `update profiles set activo = false, permisos = '{"recepcion":true}' where id = '${userA}'`);
    const afterOwnerAction = await db.query(`select activo, permisos from profiles where id = '${userA}'`);
    assert.equal(afterOwnerAction.rows[0].activo, false);
    assert.deepEqual(afterOwnerAction.rows[0].permisos, { recepcion: true });
    const bOwnerAccess = await as(db, "authenticated", ownerB, "select dato_privado from clientes");
    assert.equal(bOwnerAccess.rows.length, 1);
  } finally {
    await db.close();
  }
});
