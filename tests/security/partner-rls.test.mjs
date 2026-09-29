import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { authUserIdsToDeleteWithGym } from "../../src/lib/partners/identity.ts";

const ids = {
  userA: "00000000-0000-4000-8000-000000000001",
  userB: "00000000-0000-4000-8000-000000000002",
  userLegacy: "00000000-0000-4000-8000-000000000003",
  userOwner: "00000000-0000-4000-8000-000000000004",
  userSuspended: "00000000-0000-4000-8000-000000000005",
  partnerA: "10000000-0000-4000-8000-000000000001",
  partnerB: "10000000-0000-4000-8000-000000000002",
  partnerLegacy: "10000000-0000-4000-8000-000000000003",
  partnerOwner: "10000000-0000-4000-8000-000000000004",
  partnerSuspended: "10000000-0000-4000-8000-000000000005",
  gymLegacy: "20000000-0000-4000-8000-000000000003",
  gymOwner: "20000000-0000-4000-8000-000000000004",
  gymReferred: "20000000-0000-4000-8000-000000000006",
  payment: "30000000-0000-4000-8000-000000000006",
  commission: "40000000-0000-4000-8000-000000000006",
};

async function as(db, userId, sql) {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  try { return await db.query(sql); } finally { await db.exec("reset role"); }
}

test("PR2 migration enforces Partner isolation and preserves historical data", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      create table auth.users (id uuid primary key);
      create table gimnasios (
        id uuid primary key, nombre text not null, slug text not null,
        estado text default 'activo', tipo_cuenta text default 'gym',
        referred_by_partner_id uuid, creado_at timestamptz default now()
      );
      create table profiles (
        id uuid primary key references auth.users(id) on delete cascade,
        gimnasio_id uuid not null references gimnasios(id) on delete cascade,
        rol text not null constraint profiles_rol_check check (rol in ('dueno','cliente','staff','entrenador')),
        dni text, nombre text, telefono text, debe_cambiar_clave boolean default false,
        email_recuperacion text, activo boolean default true, permisos jsonb default '{}',
        creado_at timestamptz default now()
      );
      create table clientes (
        id uuid primary key default gen_random_uuid(), gimnasio_id uuid not null references gimnasios(id) on delete cascade,
        profile_id uuid references profiles(id) on delete cascade
      );
      create table partners (
        id uuid primary key, user_id uuid not null unique constraint partners_user_id_fkey references auth.users(id) on delete cascade,
        nombre text not null, email text, referral_code text not null unique,
        cbu_cvu text, alias_mp text, estado text not null default 'activo',
        override_commission_pct numeric, datos_cobro_actualizados_at timestamptz,
        creado_at timestamptz default now()
      );
      alter table gimnasios add constraint gimnasios_partner_fk foreign key(referred_by_partner_id) references partners(id) on delete set null;
      create table pagos_plataforma (
        id uuid primary key, gimnasio_id uuid references gimnasios(id) on delete cascade
      );
      create table partner_commissions (
        id uuid primary key, partner_id uuid not null references partners(id) on delete cascade,
        gimnasio_id uuid not null constraint partner_commissions_gimnasio_id_fkey references gimnasios(id) on delete cascade,
        pago_plataforma_id uuid not null constraint partner_commissions_pago_plataforma_id_fkey references pagos_plataforma(id) on delete cascade,
        monto_base_ars numeric, porcentaje numeric, monto_comision_ars numeric,
        periodo text, estado text default 'aprobada', creado_at timestamptz default now()
      );
      create table partner_milestone_awards (
        id uuid primary key default gen_random_uuid(), partner_id uuid not null references partners(id) on delete cascade,
        milestone integer, bono_ars numeric
      );
      create table partner_payouts (
        id uuid primary key default gen_random_uuid(), partner_id uuid not null references partners(id) on delete cascade,
        monto_ars numeric, estado text
      );
      create table partner_tiers (id integer primary key, name text);
      create table partner_notifications (
        id uuid primary key default gen_random_uuid(), partner_id uuid not null references partners(id) on delete cascade,
        titulo text, leido boolean default false
      );
      create table partner_mensajes (
        id uuid primary key default gen_random_uuid(), partner_id uuid not null references partners(id) on delete cascade,
        autor text, cuerpo text, leido boolean default false
      );
      create table push_subscriptions (
        id uuid primary key default gen_random_uuid(), profile_id uuid references profiles(id),
        partner_id uuid references partners(id), endpoint text unique, p256dh text, auth text
      );
      create table admin_audit_log (
        id bigint generated always as identity primary key,
        actor_id uuid not null references profiles(id), action text not null,
        gimnasio_id uuid references gimnasios(id) on delete set null, meta jsonb default '{}'
      );

      alter table partners enable row level security;
      alter table partner_commissions enable row level security;
      alter table partner_milestone_awards enable row level security;
      alter table partner_payouts enable row level security;
      alter table partner_notifications enable row level security;
      alter table partner_mensajes enable row level security;
      alter table push_subscriptions enable row level security;
      grant usage on schema public, auth to authenticated;
      grant execute on function auth.uid() to authenticated;
      grant all on partners, partner_commissions, partner_milestone_awards, partner_payouts,
        partner_tiers, partner_notifications, partner_mensajes, push_subscriptions to authenticated;

      insert into auth.users values
        ('${ids.userA}'),('${ids.userB}'),('${ids.userLegacy}'),('${ids.userOwner}'),('${ids.userSuspended}');
      insert into gimnasios(id,nombre,slug,tipo_cuenta,creado_at) values
        ('${ids.gymLegacy}','Partner: Histórico','partner-00000000','individual',now()),
        ('${ids.gymOwner}','Gimnasio Real','gimnasio-real','gym',now()),
        ('${ids.gymReferred}','Referido','referido','gym',now());
      insert into partners(id,user_id,nombre,email,referral_code,estado,creado_at) values
        ('${ids.partnerA}','${ids.userA}','A','a@example.com','partner-a','activo',now()),
        ('${ids.partnerB}','${ids.userB}','B','b@example.com','partner-b','activo',now()),
        ('${ids.partnerLegacy}','${ids.userLegacy}','Histórico','legacy@example.com','partner-legacy','activo',now()),
        ('${ids.partnerOwner}','${ids.userOwner}','Dueño Real','owner@example.com','partner-owner','activo',now()),
        ('${ids.partnerSuspended}','${ids.userSuspended}','Suspendido','s@example.com','partner-suspended','suspendido',now());
      update gimnasios set referred_by_partner_id='${ids.partnerA}' where id='${ids.gymReferred}';
      insert into profiles(id,gimnasio_id,rol,nombre,email_recuperacion,activo,creado_at) values
        ('${ids.userLegacy}','${ids.gymLegacy}','dueno','Histórico','legacy@example.com',true,now()),
        ('${ids.userOwner}','${ids.gymOwner}','dueno','Dueño Real','owner@example.com',true,now());
      insert into clientes(gimnasio_id,profile_id) values ('${ids.gymLegacy}','${ids.userLegacy}');
      insert into pagos_plataforma values ('${ids.payment}','${ids.gymReferred}');
      insert into partner_commissions(id,partner_id,gimnasio_id,pago_plataforma_id,monto_base_ars,porcentaje,monto_comision_ars,periodo)
        values ('${ids.commission}','${ids.partnerA}','${ids.gymReferred}','${ids.payment}',1000,10,100,'2026-09');
      insert into partner_notifications(partner_id,titulo) values
        ('${ids.partnerA}','A'),('${ids.partnerB}','B');
    `);

    const migration = await readFile(
      new URL("../../supabase/migrations/20260928233000_partner_identity_separation.sql", import.meta.url),
      "utf8",
    );
    await db.exec(migration);

    const own = await as(db, ids.userA, "select id from partners order by id");
    assert.deepEqual(own.rows, [{ id: ids.partnerA }]);
    const commissions = await as(db, ids.userA, "select id from partner_commissions");
    assert.deepEqual(commissions.rows, [{ id: ids.commission }]);
    assert.equal((await as(db, ids.userB, "select id from partner_commissions")).rows.length, 0);

    await assert.rejects(
      as(db, ids.userA, `update partners set estado='suspendido' where id='${ids.partnerA}'`),
      /permission denied/i,
    );
    await assert.rejects(
      as(db, ids.userA, `insert into partner_commissions(id,partner_id,gimnasio_id,pago_plataforma_id) values(gen_random_uuid(),'${ids.partnerA}','${ids.gymReferred}','${ids.payment}')`),
      /permission denied/i,
    );
    await assert.rejects(
      as(db, ids.userA, `insert into partner_mensajes(partner_id,autor,cuerpo) values('${ids.partnerB}','partner','ataque')`),
      /row-level security/i,
    );
    const ownMessage = await as(db, ids.userA,
      `insert into partner_mensajes(partner_id,autor,cuerpo) values('${ids.partnerA}','partner','hola') returning id`);
    assert.equal(ownMessage.rows.length, 1);
    await assert.rejects(
      as(db, ids.userSuspended, `insert into partner_mensajes(partner_id,autor,cuerpo) values('${ids.partnerSuspended}','partner','hola')`),
      /row-level security/i,
    );

    const notificationId = (await as(db, ids.userA, "select id from partner_notifications where titulo='A'")).rows[0].id;
    const marked = await as(db, ids.userA,
      `update partner_notifications set leido=true where id='${notificationId}' returning leido`);
    assert.equal(marked.rows[0].leido, true);
    await assert.rejects(
      as(db, ids.userA, `update partner_notifications set titulo='alterado' where id='${notificationId}'`),
      /permission denied/i,
    );

    const legacy = await db.query(`select rol, activo from profiles where id='${ids.userLegacy}'`);
    assert.deepEqual(legacy.rows[0], { rol: "partner_legacy_disabled", activo: false });
    const realOwner = await db.query(`select rol, activo from profiles where id='${ids.userOwner}'`);
    assert.deepEqual(realOwner.rows[0], { rol: "dueno", activo: true });

    const legacyGymContext = await as(db, ids.userLegacy, "select current_gimnasio_id() as id");
    assert.equal(legacyGymContext.rows[0].id, null);
    const ownerGymContext = await as(db, ids.userOwner, "select current_gimnasio_id() as id");
    assert.equal(ownerGymContext.rows[0].id, ids.gymOwner);

    // Same selection used by eliminarGimnasioDefinitivamente: deleting the
    // gym removes the profile but must preserve Auth + partners.user_id.
    const ownerProfileIds = (await db.query(
      `select id from profiles where gimnasio_id='${ids.gymOwner}'`,
    )).rows.map((row) => row.id);
    const ownerPartnerUserIds = (await db.query(
      `select user_id from partners where user_id = any($1::uuid[])`,
      [ownerProfileIds],
    )).rows.map((row) => row.user_id);
    const authIdsToDelete = authUserIdsToDeleteWithGym(
      ownerProfileIds,
      ownerPartnerUserIds,
    );
    assert.deepEqual(authIdsToDelete, []);
    await db.exec(`delete from gimnasios where id='${ids.gymOwner}'`);
    assert.equal((await db.query(`select id from auth.users where id='${ids.userOwner}'`)).rows.length, 1);
    assert.equal((await db.query(`select id from profiles where id='${ids.userOwner}'`)).rows.length, 0);
    assert.equal(
      (await db.query(`select user_id from partners where id='${ids.partnerOwner}'`)).rows[0].user_id,
      ids.userOwner,
    );

    await db.exec(`delete from auth.users where id='${ids.userA}'`);
    const preservedPartner = await db.query(`select user_id from partners where id='${ids.partnerA}'`);
    assert.equal(preservedPartner.rows[0].user_id, null);
    assert.equal((await db.query(`select id from partner_commissions where id='${ids.commission}'`)).rows.length, 1);

    await db.exec(`delete from gimnasios where id='${ids.gymReferred}'`);
    const preservedLedger = await db.query(
      `select gimnasio_id, pago_plataforma_id from partner_commissions where id='${ids.commission}'`,
    );
    assert.deepEqual(preservedLedger.rows[0], { gimnasio_id: null, pago_plataforma_id: null });
  } finally {
    await db.close();
  }
});
