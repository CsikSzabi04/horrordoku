// NIGHTDOKU — SQL-tesztek a Supabase-migrációkra, helyi Postgres-ben (PGlite), a Supabase szerepeit utánozva.
// Futtatás:  cd supabase/tests && npm install && npm test
// Minden supabase/migrations/NNNN_*.sql fájlt sorrendben lefuttat, majd teszteli a jogosultságokat
// (RLS), a triggereket és a függvényeket. ÚJ MIGRÁCIÓHOZ ÚJ TESZTET IS KELL ÍRNI (lásd a fájl alját).
// FIGYELEM: a PGlite NEM a valódi Supabase — a Realtime csak csonk (realtime.send / realtime.topic / realtime.messages),
// ezért a privát csatornák valódi működését a Supabase-projekten kell kézzel ellenőrizni.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const MIG = new URL('../migrations/', import.meta.url);
const db = new PGlite();

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name, extra); }
};

// Supabase-környezet utánzata
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb not null default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  create publication supabase_realtime;
  -- Realtime-csonk (a 0003 tesztjeihez): a valódi működést a Supabase adja
  create schema realtime;
  create table realtime.messages (id bigserial primary key, topic text, extension text default 'broadcast', event text, payload jsonb, private boolean default false, inserted_at timestamptz default now());
  create function realtime.topic() returns text language sql stable as $$ select nullif(current_setting('realtime.topic', true), '') $$;
  create function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void
    language sql as $$ insert into realtime.messages (topic, event, payload, private) values (topic, event, payload, private) $$;
  grant usage on schema realtime to anon, authenticated;
`);

const files = fs.readdirSync(fileURLToPath(MIG)).filter(n => /^\d{4}_.*\.sql$/.test(n)).sort();
for (const f of files) {
  try { await db.exec(fs.readFileSync(new URL(f, MIG), 'utf8')); ok('apply ' + f, true); }
  catch (e) { ok('apply ' + f, false, e.message); console.log(e); process.exit(1); }
}

// segédfüggvények: lekérdezés adott szerepkörrel
async function as(who, sql, params = []) {
  if (who === 'postgres') return db.query(sql, params);
  const role = who === 'anon' ? 'anon' : 'authenticated';
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${who === 'anon' ? '' : who}', false);`);
  try { return await db.query(sql, params); }
  finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
}
async function fails(who, sql, params = []) { try { await as(who, sql, params); return null; } catch (e) { return e.message; } }

const [u1, u2, u3] = ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'];
await db.exec(`
  insert into auth.users (id, email, raw_user_meta_data) values
   ('${u1}', 'a@x.hu', '{"username":"Kilencedik_Szem"}'),
   ('${u2}', 'b@x.hu', '{"username":"Vlad"}'),
   ('${u3}', 'c@x.hu', '{}'),
   ('44444444-4444-4444-4444-444444444444', 'd@x.hu', '{"username":"Idegen"}');
`);

console.log('\n[regisztráció-trigger]');
let r = await as('postgres', 'select id, username from public.profiles order by username');
ok('4 profil jött létre', r.rows.length === 4);
ok('megadott becenév átvéve', r.rows.some(x => x.username === 'Kilencedik_Szem'));
ok('hiányzó becenévből nyomozo_xxxxxx', r.rows.some(x => /^nyomozo_[0-9a-f]{6}$/.test(x.username)));
r = await as('postgres', 'select count(*)::int n from public.user_settings');
ok('user_settings sorok létrejöttek', r.rows[0].n === 4);
r = await as('anon', "select public.username_available('kilencedik_szem') as a, public.username_available('szabad_nev') as b");
ok('username_available kis/nagybetű-független', r.rows[0].a === false && r.rows[0].b === true);

console.log('\n[katalógus + keep-alive]');
await db.exec(`insert into public.puzzles (id, mode, title, difficulty, size, data, published) values
  ('classic-01-midnight-mass','classic','Éjféli Mise',1,6,'{}',true),
  ('classic-02-draft','classic','Piszkozat',1,6,'{}',false)`);
r = await as('anon', 'select id from public.puzzles');
ok('anon csak a kiadott pályát látja', r.rows.length === 1 && r.rows[0].id === 'classic-01-midnight-mass');
r = await as('anon', 'select public.ping() as p');
ok('anon hívhatja a ping()-et, ok=true', r.rows[0].p.ok === true && r.rows[0].p.published_puzzles === 1);
ok('anon nem írhat pályát', (await fails('anon', "insert into public.puzzles (id,mode,title,difficulty,size,data) values ('x','classic','x',1,6,'{}')")) !== null);
ok('bejelentkezett sem írhat pályát', (await fails(u1, "insert into public.puzzles (id,mode,title,difficulty,size,data) values ('x','classic','x',1,6,'{}')")) !== null);

console.log('\n[haladás, mentés, napló: csak a sajátom]');
await as(u1, `insert into public.progress (user_id, puzzle_id, solved, best_time_ms) values ('${u1}','classic-01-midnight-mass',true,154000)`);
await as(u1, `insert into public.saves (user_id, puzzle_ref, state, meta) values ('${u1}','gen:1:2:7F3K92','{"placed":{"vlad":"E1"}}','{"title":"Véletlen ügy"}')`);
const run1 = 'aaaaaaaa-0000-0000-0000-000000000001';
await as(u1, `insert into public.runs (id,user_id,puzzle_ref,kind,solved,time_ms,hints_used,wrong_submits) values ('${run1}','${u1}','classic-01-midnight-mass','catalog',true,154000,0,1)`);
await as(u1, `insert into public.runs (id,user_id,puzzle_ref,kind,room_id,role,won,solved,time_ms) values ('aaaaaaaa-0000-0000-0000-000000000002','${u1}','classic-01-midnight-mass','killer',null,'killer',true,false,90000)`);
ok('futás-naplóba duplikátum nem megy (kliens-uuid)', (await fails(u1, `insert into public.runs (id,user_id,puzzle_ref,kind,solved) values ('${run1}','${u1}','x','random',true)`)) !== null);
r = await as(u2, 'select * from public.progress'); ok('u2 nem látja u1 haladását', r.rows.length === 0);
r = await as(u2, 'select * from public.saves'); ok('u2 nem látja u1 mentését', r.rows.length === 0);
ok('u2 nem írhat u1 nevében', (await fails(u2, `insert into public.progress (user_id, puzzle_id) values ('${u1}','classic-01-midnight-mass')`)) !== null);
r = await as(u1, 'select * from public.saves'); ok('u1 látja a saját félbehagyott játékát', r.rows.length === 1 && r.rows[0].puzzle_ref === 'gen:1:2:7F3K92');
r = await as(u1, `select * from public.profile_stats where user_id = '${u1}'`);
ok('profile_stats számol (1 megoldott, 1 jumpscare, 2 co-op=1, killer-győzelem=1)',
   r.rows.length === 1 && r.rows[0].solved_total === 1 && Number(r.rows[0].jumpscares) === 1 && r.rows[0].coop_games === 1 && r.rows[0].wins_as_killer === 1, JSON.stringify(r.rows));
r = await as(u2, `select * from public.profile_stats`); ok('u2 nem látja u1 statisztikáját', r.rows.length === 0);

console.log('\n[profil]');
r = await as(u1, `update public.profiles set xp = 120 where id = '${u1}' returning xp`); ok('saját profil módosítható', r.rows.length === 1);
r = await as(u1, `update public.profiles set xp = 99999 where id = '${u2}' returning xp`); ok('más profilja nem módosítható', r.rows.length === 0);
r = await as(u2, 'select username from public.profiles'); ok('bejelentkezettek látják a profilneveket (barát-keresés)', r.rows.length === 4);
r = await as('anon', 'select 1 from public.profiles').catch(e => ({ err: e.message })); ok('anon nem olvashat profilt', r.err !== undefined);

console.log('\n[barátok]');
await as(u1, `select public.send_friend_request('${u2}')`);
r = await as(u2, 'select friend_id, username, status, requested_by from public.my_friends');
ok('u2 látja a függő kérést u1-től', r.rows.length === 1 && r.rows[0].status === 'pending' && r.rows[0].requested_by === u1 && r.rows[0].username === 'Kilencedik_Szem');
await as(u1, `select public.respond_friend_request('${u2}', true)`);
r = await as(u1, 'select status from public.my_friends'); ok('a kérő nem fogadhatja el a saját kérését', r.rows[0].status === 'pending');
await as(u2, `select public.respond_friend_request('${u1}', true)`);
r = await as(u1, 'select status, username from public.my_friends'); ok('elfogadás után mindkét oldalon barát', r.rows[0].status === 'accepted' && r.rows[0].username === 'Vlad');
ok('magát nem adhatja hozzá', (await fails(u1, `select public.send_friend_request('${u1}')`)) !== null);
ok('ismeretlen felhasználót nem adhat hozzá', (await fails(u1, `select public.send_friend_request('99999999-9999-9999-9999-999999999999')`)) !== null);
ok('kliens közvetlenül nem szúrhat be barátságot', (await fails(u3, `insert into public.friendships (user_a,user_b,requested_by,status) values ('${u1}','${u3}','${u3}','accepted')`)) !== null);
await as(u3, `select public.send_friend_request('${u1}')`);
await as(u1, `select public.send_friend_request('${u3}')`);
r = await as(u1, `select status from public.my_friends where friend_id = '${u3}'`); ok('kölcsönös kérés automatikusan elfogadódik', r.rows[0].status === 'accepted');
r = await as(u3, `select count(*)::int n from public.friendships`); ok('u3 csak a saját barátságait látja', r.rows[0].n === 1);

console.log('\n[szobák + chat]');
r = await as(u1, `select * from public.create_room('together', 'classic-01-midnight-mass', 2::smallint, '{"timeLimit":600}')`);
const room = r.rows[0]; ok('szoba létrejött, 6 jegyű kód, lobby', /^[0-9A-F]{6}$/.test(room.code) && room.status === 'lobby' && room.host_id === u1);
r = await as(u1, `select count(*)::int n from public.room_members where room_id = '${room.id}'`); ok('a létrehozó automatikusan tag', r.rows[0].n === 1);
ok('új szoba ajtaja zárva indul', room.is_open === false);
await as(u1, `select public.set_room_open('${room.id}', true)`); // a régi tesztek nyitott szobával dolgoznak
r = await as(u3, 'select * from public.rooms'); ok('kívülálló nem látja a szobát', r.rows.length === 0);
await as(u2, `select * from public.join_room('${room.code.toLowerCase()}')`); ok('belépés (kis/nagybetű mindegy)', true);
r = await as(u2, 'select * from public.rooms'); ok('tag látja a szobát', r.rows.length === 1);
ok('teli szobába nem lehet belépni (max 2)', (await fails(u3, `select * from public.join_room('${room.code}')`)) !== null);
ok('rossz kóddal nem lehet belépni', (await fails(u3, `select * from public.join_room('ZZZZZZ')`)) !== null);
await as(u2, `insert into public.room_messages (room_id,user_id,body) values ('${room.id}','${u2}','Szia, a harang mellett Morrigan áll!')`);
ok('kívülálló nem írhat a chatbe', (await fails(u3, `insert into public.room_messages (room_id,user_id,body) values ('${room.id}','${u3}','spam')`)) !== null);
ok('más nevében nem írhat', (await fails(u2, `insert into public.room_messages (room_id,user_id,body) values ('${room.id}','${u1}','hamis')`)) !== null);
ok('üres üzenet nem megy', (await fails(u2, `insert into public.room_messages (room_id,user_id,body) values ('${room.id}','${u2}','')`)) !== null);
r = await as(u1, 'select body from public.room_messages'); ok('a másik tag látja a chatet', r.rows.length === 1);
r = await as(u3, 'select body from public.room_messages'); ok('kívülálló nem látja a chatet', r.rows.length === 0);
ok('nem host nem indíthat', (await fails(u2, `select * from public.start_room('${room.id}')`)) !== null);
r = await as(u1, `select * from public.start_room('${room.id}')`); ok('host indíthat', r.rows[0].status === 'playing');
r = await as(u2, `select public.save_room_state('${room.id}', 0, '{"placed":{"vlad":"E1"}}') as rev`); ok('állapot mentése: rev 0 -> 1', r.rows[0].rev === 1);
ok('elavult rev ütközik', (await fails(u1, `select public.save_room_state('${room.id}', 0, '{}')`)) !== null);
ok('kívülálló nem menthet állapotot', (await fails(u3, `select public.save_room_state('${room.id}', 1, '{}')`)) !== null);
await as(u1, `select public.invite_friend('${room.id}', '${u2}')`);
r = await as(u2, 'select room_id from public.room_invites'); ok('meghívó megérkezik a címzettnek', r.rows.length === 1);
await as(u2, `delete from public.room_invites where to_user = '${u2}'`);
r = await as(u2, 'select 1 from public.room_invites'); ok('meghívó elutasítható', r.rows.length === 0);
ok('nem baráttal nem hívható', (await fails(u1, `select public.invite_friend('${room.id}', '44444444-4444-4444-4444-444444444444')`)) !== null);
ok('a tulajdonos nem léphet ki (törölnie kell)', (await fails(u1, `select public.leave_room('${room.id}')`)) !== null);
await as(u2, `select public.leave_room('${room.id}')`);
r = await as('postgres', `select (select count(*)::int from public.room_members where room_id = '${room.id}') m, (select host_id from public.rooms where id = '${room.id}') h`); ok('tag kilép -> a szoba és a tulajdonos megmarad', r.rows[0].m === 1 && r.rows[0].h === u1);
await as(u1, `select public.delete_room('${room.id}')`);
r = await as('postgres', `select (select count(*)::int from public.rooms where id = '${room.id}') n, (select count(*)::int from public.room_messages where room_id = '${room.id}') c`); ok('a tulajdonos törli a szobát: a chat is törlődik', r.rows[0].n === 0 && r.rows[0].c === 0);
r = await as('postgres', `select public.cleanup_old_rooms() as n`); ok('cleanup_old_rooms lefut', typeof r.rows[0].n === 'number');
ok('anon nem hívhat szoba-függvényt', (await fails('anon', `select * from public.create_room('together','x',2::smallint,'{}')`)) !== null);
ok('kliens nem hívhatja a cleanup-ot', (await fails(u1, `select public.cleanup_old_rooms()`)) !== null);

// --- 0003: my_invites (a meghívott még nem tag, mégis látja a kódot / módot / meghívót) ---
{
  const n1 = (await as('postgres', `select username from public.profiles where id = '${u1}'`)).rows[0].username;
  r = await as(u1, `select * from public.create_room('together','classic-01',4::smallint,'{}')`);
  const room2 = r.rows[0];
  await as(u1, `select public.invite_friend('${room2.id}', '${u2}')`);
  r = await as(u2, 'select * from public.my_invites()');
  ok('my_invites: a meghívott látja a kódot, módot és a meghívó nevét', r.rows.length === 1 && r.rows[0].code === room2.code && r.rows[0].mode === 'together' && r.rows[0].from_username === n1);
  r = await as(u3, 'select * from public.my_invites()'); ok('my_invites: más meghívóját nem látja', r.rows.length === 0);
  ok('my_invites: anon nem hívhatja', (await fails('anon', 'select * from public.my_invites()')) !== null);
  await as(u1, `select public.start_room('${room2.id}')`);
  r = await as(u2, 'select * from public.my_invites()'); ok('my_invites: elindult szobához már nincs meghívó a listában', r.rows.length === 0);
}

// --- 0004: kereshetőség, online-állapot, ranglista, nyilvános profil, moderáció, barát-limit ---
{
  const name = async (u) => (await as('postgres', `select username from public.profiles where id = '${u}'`)).rows[0].username;
  const [n2, n3] = [await name(u2), await name(u3)];
  r = await as(u1, `select * from public.search_profiles('${n2.slice(0, 3)}')`); ok('search_profiles: megtalálja a kereshető profilt', r.rows.some(x => x.id === u2));
  r = await as(u2, `select * from public.search_profiles('${n2.slice(0, 3)}')`);
  ok('search_profiles: a saját profilt is megmutatja, jelölve (is_me)', r.rows.some(x => x.id === u2 && x.is_me === true) && (await as(u1, `select * from public.search_profiles('${n2.slice(0, 3)}')`)).rows.every(x => x.is_me === false));
  r = await as(u1, `select * from public.search_profiles('${n2.slice(1, 4)}')`); ok('search_profiles: a név közepén is keres (nem csak az elején)', r.rows.some(x => x.id === u2));
  r = await as(u1, `select * from public.search_profiles('${n2.slice(0, 3).toUpperCase()}')`); ok('search_profiles: kis/nagybetűre nem érzékeny', r.rows.some(x => x.id === u2));
  r = await as(u1, `select * from public.search_profiles('%%')`); ok('search_profiles: a % nem joker', r.rows.length === 0);
  r = await as(u1, `select * from public.search_profiles('${n2.slice(0, 1)}')`); ok('search_profiles: 1 karakternél üres', r.rows.length === 0);
  await as(u3, `update public.profiles set searchable = false where id = '${u3}'`);
  r = await as(u1, `select * from public.search_profiles('${n3.slice(0, 3)}')`); ok('search_profiles: a nem kereshető profil rejtve marad', !r.rows.some(x => x.id === u3));

  // online-állapot
  r = await as(u1, `select online from public.my_friends where friend_id = '${u2}'`); ok('my_friends: szívverés nélkül offline', r.rows[0].online === false);
  await as(u2, 'select public.touch_presence(false)');
  r = await as(u1, `select online from public.my_friends where friend_id = '${u2}'`); ok('my_friends: szívverés után online', r.rows[0].online === true);
  await as(u2, 'select public.touch_presence(true)');
  r = await as(u1, `select online from public.my_friends where friend_id = '${u2}'`); ok('my_friends: láthatatlan módban offline-nak látszik', r.rows[0].online === false);

  // ranglista
  ok('submit_score: rossz tábla elutasítva', (await fails(u1, "select public.submit_score('bármi', 90000, 0::smallint)")) !== null);
  const TODAY = new Date().toISOString().slice(0, 10); // a napi tábla csak a mai (±1 nap) lehet
  ok('submit_score: irreálisan gyors idő elutasítva', (await fails(u1, "select public.submit_score('daily:" + TODAY + "', 500, 0::smallint)")) !== null);
  ok('a ranglista közvetlenül nem írható', (await fails(u1, `insert into public.leaderboard (board, user_id, time_ms) values ('daily:${TODAY}','${u1}', 4000)`)) !== null);
  await as(u1, "select public.submit_score('daily:" + TODAY + "', 90000, 1::smallint)");
  await as(u2, "select public.submit_score('daily:" + TODAY + "', 80000, 0::smallint)");
  await as(u1, "select public.submit_score('daily:" + TODAY + "', 95000, 0::smallint)");
  r = await as('postgres', `select time_ms from public.leaderboard where user_id = '${u1}'`); ok('submit_score: a rosszabb idő nem írja felül a jobbat', r.rows[0].time_ms === 90000);
  await as(u1, "select public.submit_score('daily:" + TODAY + "', 70000, 0::smallint)");
  await as(u3, "select public.submit_score('daily:" + TODAY + "', 60000, 0::smallint)");
  r = await as(u1, "select username, time_ms from public.leaderboard_top('daily:" + TODAY + "', 10)");
  ok('leaderboard_top: javuló idő, sorrend, a nem kereshető profil rejtve', r.rows.map(x => x.time_ms).join() === '70000,80000');
  r = await as(u3, "select time_ms from public.leaderboard_top('daily:" + TODAY + "', 10)"); ok('leaderboard_top: a nem kereshető a saját sorát látja', r.rows[0].time_ms === 60000);

  // nyilvános profil
  await as('postgres', `insert into public.runs (id, user_id, puzzle_ref, kind, solved, time_ms, hints_used) values (gen_random_uuid(), '${u2}', 'classic-01', 'catalog', true, 1000, 0)`);
  r = await as(u1, `select solved_total::int as s, solved_no_hints::int as n from public.public_profile('${u2}')`); ok('public_profile: baráttól látszik a statisztika', r.rows.length === 1 && r.rows[0].s === 1 && r.rows[0].n === 1);
  const stranger = (await as('postgres', "insert into auth.users (id, email) values (gen_random_uuid(), 'stranger@x.hu') returning id")).rows[0].id;
  await as('postgres', `update public.profiles set searchable = false where id = '${stranger}'`);
  r = await as(u1, `select * from public.public_profile('${stranger}')`); ok('public_profile: nem kereshető, nem barát → nincs adat', r.rows.length === 0);
  r = await as(u3, `select * from public.public_profile('${u3}')`); ok('public_profile: a saját profil mindig látszik', r.rows.length === 1);

  // moderáció
  r = await as(u1, `select * from public.create_room('together','classic-01',4::smallint,'{}')`);
  const room3 = r.rows[0];
  await as(u1, `select public.set_room_open('${room3.id}', true)`);
  await as(u2, `select * from public.join_room('${room3.code}')`);
  r = await as(u2, `insert into public.room_messages (room_id, user_id, body) values ('${room3.id}', '${u2}', 'csúnya szó') returning id`);
  const msg = r.rows[0].id;
  await as(u1, `select public.report_message(${msg}, 'sértő')`);
  await as(u1, `select public.report_message(${msg}, 'ismét')`);
  r = await as('postgres', 'select count(*)::int n, min(reported::text) rep from public.chat_reports'); ok('report_message: egyszer rögzül, a jelentett a szerző', r.rows[0].n === 1 && r.rows[0].rep === u2);
  ok('report_message: kívülálló nem jelenthet', (await fails(u3, `select public.report_message(${msg}, 'x')`)) !== null);
  ok('report_message: saját üzenet nem jelenthető', (await fails(u2, `select public.report_message(${msg}, 'x')`)) !== null);
  ok('a jelentéseket a kliens nem olvashatja', (await fails(u1, 'select * from public.chat_reports')) !== null);
  await as(u1, `insert into public.chat_mutes (user_id, muted_id) values ('${u1}', '${u2}')`);
  r = await as(u1, 'select * from public.chat_mutes'); ok('chat_mutes: a saját némítások látszanak', r.rows.length === 1);
  r = await as(u2, 'select * from public.chat_mutes'); ok('chat_mutes: más némítása nem látszik', r.rows.length === 0);
  ok('chat_mutes: magamat nem némíthatom', (await fails(u1, `insert into public.chat_mutes (user_id, muted_id) values ('${u1}', '${u1}')`)) !== null);

  // barát-limit: 100 függő kérés után a 101. elutasítva
  await as('postgres', "insert into auth.users (id, email) select gen_random_uuid(), 'limit' || g || '@x.hu' from generate_series(1, 100) g");
  await as('postgres', `insert into public.friendships (user_a, user_b, requested_by) select least('${u1}'::uuid, x.id), greatest('${u1}'::uuid, x.id), '${u1}'::uuid from auth.users x where x.email like 'limit%@x.hu'`);
  r = await as('postgres', `select count(*)::int n from public.friendships where '${u1}' in (user_a, user_b)`);
  ok('barát-limit: a teszt-előkészítés 100+ kapcsolatot hozott létre', r.rows[0].n >= 100);
  ok('barát-limit: a limit felett nem küldhető új kérés', (await fails(u1, `select public.send_friend_request('${u3}')`)) !== null);
}

// --- 0005: tartós szobák (név, nyitott/zárt ajtó, törlés, követés, statisztika) ---
{
  r = await as(u1, `select * from public.create_room('together', 'classic-01', 3::smallint, '{}', '  A mi szobánk  ')`);
  const R = r.rows[0];
  ok('create_room: név levágva, ajtó zárva', R.name === 'A mi szobánk' && R.is_open === false);
  r = await as(u2, `select * from public.room_peek('${R.code.toLowerCase()}')`);
  ok('room_peek: a zárt szoba létezése látszik (név, gazda, zárt), belépés nélkül', r.rows.length === 1 && r.rows[0].is_open === false && r.rows[0].is_member === false && r.rows[0].name === 'A mi szobánk');
  r = await as(u2, `select * from public.rooms where id = '${R.id}'`); ok('a zárt szoba tartalma nem olvasható', r.rows.length === 0);
  const closedErr = await fails(u2, `select * from public.join_room('${R.code}')`);
  ok('zárt szobába nem lehet belépni (a létrehozó nem nyitotta meg)', closedErr !== null && /closed/.test(closedErr), String(closedErr));
  await as(u2, `select public.follow_room('${R.code}')`);
  r = await as(u2, `select * from public.my_rooms() where room_id = '${R.id}'`);
  ok('my_rooms: a követett zárt szoba látszik (nem saját, nem tag)', r.rows.length === 1 && r.rows[0].is_owner === false && r.rows[0].is_member === false && r.rows[0].is_open === false);
  r = await as(u1, `select * from public.my_rooms() where room_id = '${R.id}'`);
  ok('my_rooms: a saját szoba tulajdonosként, 1 taggal', r.rows[0].is_owner === true && r.rows[0].owner_id === u1 && Number(r.rows[0].member_count) === 1);
  ok('csak a tulajdonos nyithatja meg', (await fails(u2, `select public.set_room_open('${R.id}', true)`)) !== null);
  await as(u1, `select public.set_room_open('${R.id}', true)`);
  await as(u2, `select * from public.join_room('${R.code}')`);
  r = await as(u2, `select * from public.my_rooms() where room_id = '${R.id}'`);
  const follows = (await as('postgres', `select count(*)::int n from public.room_follows where room_id = '${R.id}'`)).rows[0].n;
  ok('megnyitás után belép; a követés tagsággá válik', r.rows.length === 1 && r.rows[0].is_member === true && follows === 0);
  await as(u1, `select public.set_room_open('${R.id}', false)`);
  r = await as(u2, `select * from public.rooms where id = '${R.id}'`); ok('az ajtó bezárása után a tag sem éri el a szoba tartalmát', r.rows.length === 0);
  r = await as(u1, `select * from public.rooms where id = '${R.id}'`); ok('a tulajdonos zárt ajtónál is eléri', r.rows.length === 1);
  r = await as(u2, `select * from public.my_rooms() where room_id = '${R.id}'`); ok('a tag a zárt szobát a listában még látja', r.rows.length === 1 && r.rows[0].is_open === false);
  await as(u1, `select public.set_room_open('${R.id}', true)`);

  // beállítás két játék között
  ok('nem tulajdonos nem állíthatja át', (await fails(u2, `select * from public.configure_room('${R.id}', 'x', null, null, null)`)) !== null);
  r = await as(u1, `select * from public.configure_room('${R.id}', 'Új név', 'classic-02', null, '{"timeLimit":300}')`);
  ok('configure_room: név + pálya átállítva, a többi marad', r.rows[0].name === 'Új név' && r.rows[0].puzzle_ref === 'classic-02' && r.rows[0].max_players === 3);

  // játék + statisztika
  ok('nem tulajdonos nem indíthat', (await fails(u2, `select * from public.start_room('${R.id}')`)) !== null);
  await as(u1, `select * from public.start_room('${R.id}')`);
  ok('játék közben nem zárható az ajtó', (await fails(u1, `select public.set_room_open('${R.id}', false)`)) !== null);
  ok('játék közben nem állítható át', (await fails(u1, `select * from public.configure_room('${R.id}', 'x', null, null, null)`)) !== null);
  await as(u1, `select * from public.finish_game('${R.id}', true, 90000)`);
  r = await as('postgres', `select status from public.rooms where id = '${R.id}'`); ok('finish_game: a szoba visszatér a lobbyba', r.rows[0].status === 'lobby');
  ok('nem futó játékot nem lehet lezárni', (await fails(u1, `select * from public.finish_game('${R.id}', true, 1000)`)) !== null);
  await as(u1, `select * from public.start_room('${R.id}')`);
  await as(u1, `select * from public.finish_game('${R.id}', false, 50000)`);
  await as(u1, `select * from public.start_room('${R.id}')`);
  await as(u1, `select * from public.finish_game('${R.id}', true, 70000)`);
  r = await as(u2, `select games_played::int gp, games_solved::int gs, best_ms, avg_ms, total_ms::int tm from public.room_stats('${R.id}')`);
  ok('room_stats: 3 játék, 2 megoldva, legjobb 70 mp, átlag 80 mp, összes 210 mp', r.rows[0].gp === 3 && r.rows[0].gs === 2 && r.rows[0].best_ms === 70000 && r.rows[0].avg_ms === 80000 && r.rows[0].tm === 210000);
  r = await as(u3, `select games_played::int gp from public.room_stats('${R.id}')`); ok('room_stats: kívülálló csupa nullát kap', r.rows[0].gp === 0);
  r = await as(u2, `select * from public.room_recent_games('${R.id}', 2)`); ok('room_recent_games: a legutóbbi 2, újabb elöl', r.rows.length === 2 && r.rows[0].ms === 70000 && r.rows[0].players === 2);
  r = await as(u1, `select games_played::int gp, games_solved::int gs from public.my_rooms() where room_id = '${R.id}'`); ok('my_rooms: játék-számláló', r.rows[0].gp === 3 && r.rows[0].gs === 2);

  // limit, törlés
  const have = (await as('postgres', `select count(*)::int n from public.rooms where host_id = '${u1}'`)).rows[0].n;
  for (let i = have; i < 5; i++) await as(u1, `select * from public.create_room('killer', 'classic-01')`);
  ok('legfeljebb 5 saját szoba', (await fails(u1, `select * from public.create_room('together', 'classic-01')`)) !== null);
  ok('nem tulajdonos nem törölhet', (await fails(u2, `select public.delete_room('${R.id}')`)) !== null);
  await as(u1, `select public.delete_room('${R.id}')`);
  r = await as('postgres', `select (select count(*)::int from public.rooms where id = '${R.id}') a, (select count(*)::int from public.room_games where room_id = '${R.id}') b, (select count(*)::int from public.room_members where room_id = '${R.id}') c`);
  ok('delete_room: a szoba, a naplója és a tagjai is törlődnek', r.rows[0].a === 0 && r.rows[0].b === 0 && r.rows[0].c === 0);
  r = await as(u2, `select * from public.my_rooms() where room_id = '${R.id}'`); ok('törlés után a tagnál is eltűnik a listából', r.rows.length === 0);
  ok('anon nem hívhatja a szoba-függvényeket', (await fails('anon', 'select * from public.my_rooms()')) !== null);

  // takarítás: csak a 90 napnál régebbi szoba törlődik
  await as('postgres', "update public.rooms set updated_at = now() - interval '91 days' where id = (select id from public.rooms where mode = 'killer' order by created_at limit 1)");
  r = await as('postgres', 'select public.cleanup_old_rooms() as n'); ok('cleanup_old_rooms: csak a 90 napnál régebbit törli', r.rows[0].n === 1);
}

// --- 0006: barát-kód + keresés ---
{
  const codes = (await as('postgres', 'select user_id, code from public.profile_codes')).rows;
  ok('0006: minden meglévő profil kapott kódot', codes.length === (await as('postgres', 'select count(*)::int n from public.profiles')).rows[0].n);
  ok('0006: a kód 10 karakter, a félreolvasható karakterek nélkül', codes.every(c => c.code.length === 10 && !/[IlO01]/.test(c.code)));
  ok('0006: a kódok egyediek', new Set(codes.map(c => c.code)).size === codes.length);
  ok('0006: a kódokban betű, szám és írásjel is előfordul', codes.some(c => /[a-z]/.test(c.code)) && codes.some(c => /[0-9]/.test(c.code)) && (await as('postgres', "select string_agg(public.new_friend_code(), '') s from generate_series(1, 30)")).rows[0].s.match(/[!@#$%&*+=?]/));
  ok('0006: közvetlenül senki nem olvassa a kód-táblát', (await fails(u1, 'select * from public.profile_codes')) !== null && (await fails('anon', 'select * from public.profile_codes')) !== null);
  const mine = (await as(u1, 'select public.my_friend_code() as c')).rows[0].c;
  ok('0006: my_friend_code: a saját kódomat adja, stabilan', mine === codes.find(c => c.user_id === u1).code && (await as(u1, 'select public.my_friend_code() as c')).rows[0].c === mine);
  ok('0006: my_friend_code: anon nem hívhatja', (await fails('anon', 'select public.my_friend_code()')) !== null);
  // új felhasználó a triggerből kap kódot
  await db.exec("insert into auth.users (id, email, raw_user_meta_data) values ('55555555-5555-5555-5555-555555555555', 'e@x.hu', '{\"username\":\"Ujonc\"}')");
  ok('0006: az új profil automatikusan kódot kap', (await as('postgres', "select count(*)::int n from public.profile_codes where user_id = '55555555-5555-5555-5555-555555555555'")).rows[0].n === 1);
  // keresés kóddal
  const code2 = codes.find(c => c.user_id === u2).code;
  r = await as(u1, `select * from public.find_by_code('${code2.replaceAll("'", "''")}')`); ok('0006: find_by_code: megtalálja a profilt, nem saját', r.rows.length === 1 && r.rows[0].id === u2 && r.rows[0].is_me === false);
  r = await as(u2, `select * from public.find_by_code('${code2.replaceAll("'", "''")}')`); ok('0006: find_by_code: a saját kódomnál is_me', r.rows.length === 1 && r.rows[0].is_me === true);
  r = await as(u1, `select * from public.find_by_code('${code2.toLowerCase().replaceAll("'", "''")}')`); ok('0006: find_by_code: a kis/nagybetű számít', code2 === code2.toLowerCase() || r.rows.length === 0);
  r = await as(u1, "select * from public.find_by_code('rövid')"); ok('0006: find_by_code: rossz hosszúságú kódra üres', r.rows.length === 0);
  const code3 = codes.find(c => c.user_id === u3).code;
  r = await as(u1, `select * from public.find_by_code('${code3.replaceAll("'", "''")}')`); ok('0006: find_by_code: a nem kereshető profilt is megtalálja (aki a kódot adja, azt akarja)', r.rows.length === 1 && r.rows[0].id === u3);
  ok('0006: find_by_code: anon nem hívhatja', (await fails('anon', "select * from public.find_by_code('x')")) !== null);
  ok('0006: a profil törlésekor a kódja is törlődik', await (async () => { await db.exec("delete from public.profiles where id = '55555555-5555-5555-5555-555555555555'"); return (await as('postgres', "select count(*)::int n from public.profile_codes where user_id = '55555555-5555-5555-5555-555555555555'")).rows[0].n === 0 })());
}

// --- 0007: Gyilkos mód (szerepsorsolás, képességek, Szimat, Gyűlés, közös beküldés, Epilógus, vég) ---
{
  console.log('\n[0007: Gyilkos mód]');
  await db.exec('delete from public.rooms');
  const u4 = '44444444-4444-4444-4444-444444444444';
  const out = '66666666-6666-6666-6666-666666666666';
  await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values ('${out}', 'f@x.hu', '{"username":"Kivulallo"}')`);
  const mk = async (host, settings, max = 4) => {
    const rr = (await as(host, `select * from public.create_room('killer','classic-01',${max}::smallint,'${JSON.stringify(settings)}')`)).rows[0];
    await as(host, `select public.set_room_open('${rr.id}', true)`);
    return rr;
  };
  const S = async (u, room) => (await as(u, `select public.killer_state('${room}') as s`)).rows[0].s;
  const beat = async (u, room) => (await as(u, `select public.killer_beat('${room}') as s`)).rows[0].s;
  const rpc = (u, sql) => as(u, sql);
  const roles = async (game) => Object.fromEntries((await as('postgres', `select user_id, role from public.room_roles where game_id = ${game}`)).rows.map(x => [x.user_id, x.role]));
  const shiftGame = (id, set) => as('postgres', `update public.killer_games set ${set} where id = ${id}`);
  const events = async (room, kind) => (await as('postgres', `select kind, payload from public.room_events where room_id = '${room}' ${kind ? `and kind = '${kind}'` : ''} order by id`)).rows;
  const all = [u1, u2, u3, u4];

  // ---- indítás, szerepsorsolás, titkosság
  const K = await mk(u1, { timeLimit: 600, lives: 2, meetings: 2, sniffPerDetective: 1 });
  ok('killer: egy taggal nem indítható', (await fails(u1, `select * from public.start_room('${K.id}')`)) !== null);
  for (const u of [u2, u3, u4]) await as(u, `select * from public.join_room('${K.code}')`);
  ok('killer: nem host nem indíthat', (await fails(u2, `select * from public.start_room('${K.id}')`)) !== null);
  r = await as(u1, `select * from public.start_room('${K.id}')`);
  ok('killer: a host elindítja', r.rows[0].status === 'playing');
  let G = (await as('postgres', `select id, cfg, lives from public.killer_games where room_id = '${K.id}'`)).rows[0];
  const R = await roles(G.id);
  const killer = Object.keys(R).find(k => R[k] === 'killer');
  const dets = all.filter(u => u !== killer);
  ok('killer: 4 játékos, pontosan 1 gyilkos, 3 nyomozó', Object.keys(R).length === 4 && Object.values(R).filter(x => x === 'killer').length === 1);
  ok('killer: a beállítások szabályos tartományba kerültek', G.cfg.lives === 2 && G.cfg.timeLimit === 600 && G.cfg.killerCount === 1 && G.cfg.abilities.vanish === true && G.cfg.cooldownScale === 1);
  r = await as(u2, 'select * from public.room_roles'); ok('szerep: mindenki csak a SAJÁT sorát látja', r.rows.length === 1 && r.rows[0].user_id === u2);
  ok('szerep: anon nem látja', (await fails('anon', 'select * from public.room_roles')) !== null);
  ok('szerep: közvetlenül nem írható', (await fails(u2, `update public.room_roles set role = 'killer'`)) !== null || (await as(u2, `update public.room_roles set role = 'killer' where user_id = '${u2}' returning 1`)).rows.length === 0);
  ok('killer_games közvetlenül nem olvasható', (await fails(u2, 'select * from public.killer_games')) !== null);
  ok('room_events: kívülálló nem olvashatja', (await as(out, 'select * from public.room_events')).rows.length === 0);
  ok('room_events: kliens nem írhat', (await fails(u2, `insert into public.room_events (room_id, kind) values ('${K.id}','fx')`)) !== null);
  ok('killer_state: kívülálló nem hívhatja', (await fails(out, `select public.killer_state('${K.id}')`)) !== null);
  ok('killer_state: anon nem hívhatja', (await fails('anon', `select public.killer_state('${K.id}')`)) !== null);
  const sk = await S(killer, K.id);
  const sd = await S(dets[0], K.id);
  ok('állapot: a gyilkos a saját szerepét, hűtéseit és képességeit látja', sk.role === 'killer' && sk.cooldowns && sk.abilities.textSwap === true && sk.lives === 2 && sk.timeLimitMs === 600000);
  ok('állapot: a nyomozó nem lát hűtést / képességet, és nem látja a gyilkost', sd.role === 'detective' && sd.cooldowns === undefined && sd.abilities === undefined && !JSON.stringify(sd).includes(killer) && sd.exposedKillers.length === 0);
  ok('állapot: a gyilkos is látja a Szimat/Gyűlés nélküli keretet (0 szimat)', sk.sniffsLeft === 0 && sk.canCallMeeting === false && sd.sniffsLeft === 1 && sd.canCallMeeting === true);

  // ---- képességek
  ok('képesség: nyomozó nem használhatja', (await fails(dets[0], `select public.use_ability('${K.id}','textSwap','{"char":"vlad","text":"Hamis nyom szöveg"}')`)) !== null);
  ok('képesség: ismeretlen képesség elutasítva', (await fails(killer, `select public.use_ability('${K.id}','laser','{}')`)) !== null);
  ok('képesség: rossz célpont elutasítva (textSwap)', (await fails(killer, `select public.use_ability('${K.id}','textSwap','{"char":"???","text":"Hamis nyom szöveg"}')`)) !== null);
  r = await as(killer, `select public.use_ability('${K.id}','textSwap','{"char":"vlad","text":"A harang mellett volt."}') as x`);
  ok('képesség: Szövegcsere megy, a hűtés látszik a gyilkosnak', r.rows[0].x.ok === true && r.rows[0].x.cooldowns.textSwap > 0);
  let ev = await events(K.id, 'fx');
  ok('képesség: a hatás-esemény megérkezik a szobának (clue_override, 5 mp)', ev.length === 1 && ev[0].payload.type === 'clue_override' && ev[0].payload.char === 'vlad' && ev[0].payload.ms === 5000);
  ok('képesség: az eseményben NINCS feladó (a gyilkos azonosítója sehol)', !JSON.stringify(await events(K.id)).includes(killer));
  ok('képesség: egyszerre csak egy hatás / közös hűtés', (await fails(killer, `select public.use_ability('${K.id}','vanish','{"cell":"E3"}')`)) !== null);
  await shiftGame(G.id, `effect_until = null, global_cd_until = null`);
  ok('képesség: ugyanannak a képességnek a hűtése él', (await fails(killer, `select public.use_ability('${K.id}','textSwap','{"char":"vlad","text":"Megint hamis"}')`)) !== null);
  ok('képesség: a nyomozó nem látja a képesség-naplót (killer_games zárt)', (await fails(dets[0], 'select ability_log from public.killer_games')) !== null);
  r = await as(killer, `select public.use_ability('${K.id}','vanish','{"cell":"E3"}') as x`);
  ev = await events(K.id, 'fx');
  ok('képesség: Eltüntetés (8 mp, cella)', r.rows[0].x.ok === true && ev[1].payload.type === 'object_vanish' && ev[1].payload.cell === 'E3' && ev[1].payload.ms === 8000);
  ok('Eltüntetés: a zárolt mezők az állapotban is ott vannak (későn érkezőnek is) — a nyomozó is látja', (await S(dets[1], K.id)).seals.length === 1 && (await S(dets[1], K.id)).seals[0].cell === 'E3' && (await S(dets[1], K.id)).seals[0].until - (await S(dets[1], K.id)).seals[0].from === 8000);
  await shiftGame(G.id, `effect_until = null, global_cd_until = null`);
  ok('képesség: rossz cella-azonosító elutasítva', (await fails(killer, `select public.use_ability('${K.id}','timeWarp','{"mode":"nope"}')`)) !== null);
  const before = (await as('postgres', `select penalty_ms from public.killer_games where id = ${G.id}`)).rows[0].penalty_ms;
  await as(killer, `select public.use_ability('${K.id}','timeWarp','{"mode":"steal"}')`);
  const after = (await as('postgres', `select penalty_ms from public.killer_games where id = ${G.id}`)).rows[0].penalty_ms;
  ok('Időcsavar (lopás): 20 mp-et levon a hátralévő időből', Number(after) - Number(before) === 20000);
  r = await as(killer, `select public.killer_state('${K.id}') as s`);
  ok('állapot: a hátralévő idő (határidő − büntetés) csökkent', Number(r.rows[0].s.penaltyMs) === Number(after));
  // a 3-as korlát
  for (let i = 0; i < 2; i++) {
    await shiftGame(G.id, `effect_until = null, global_cd_until = null, cd = '{}'`);
    await as(killer, `select public.use_ability('${K.id}','timeWarp','{"mode":"speed"}')`);
  }
  await shiftGame(G.id, `effect_until = null, global_cd_until = null, cd = '{}'`);
  ok('Időcsavar: játékonként legfeljebb 3×', (await fails(killer, `select public.use_ability('${K.id}','timeWarp','{"mode":"steal"}')`)) !== null);
  r = await as('postgres', `select speed from public.killer_games where id = ${G.id}`);
  ok('Időcsavar (gyorsítás): 10 mp-es, háromszoros szakasz kerül a naplóba', r.rows[0].speed.length === 2 && r.rows[0].speed[0].factor === 3 && r.rows[0].speed[0].until - r.rows[0].speed[0].from === 10000);
  r = await as('postgres', `select public.kg_remaining_ms(g, floor(extract(epoch from now()) * 1000)::bigint + 20000) as m, public.kg_remaining_ms(g, floor(extract(epoch from now()) * 1000)::bigint) as m0 from public.killer_games g where id = ${G.id}`);
  ok('hátralévő idő: a gyorsított szakasz többletet von le (3× sebesség)', Number(r.rows[0].m0) - Number(r.rows[0].m) > 20000);

  // ---- Szimat
  ok('Szimat: a gyilkos nem szimatolhat', (await fails(killer, `select public.sniff('${K.id}')`)) !== null);
  r = await as(dets[0], `select public.sniff('${K.id}') as x`);
  ok('Szimat: a nemrég használt képességre „igen”', r.rows[0].x.used === true);
  ok('Szimat: nyomozónként 1 (a keret a beállításokból)', (await fails(dets[0], `select public.sniff('${K.id}')`)) !== null);
  ev = await events(K.id, 'sniff');
  ok('Szimat: az eredmény az egész szobának megy, név nélkül', ev.length === 1 && ev[0].payload.used === true && !JSON.stringify(ev[0]).includes(dets[0]));
  await shiftGame(G.id, `ability_log = (select coalesce(jsonb_agg(jsonb_set(e, '{at}', to_jsonb((e->>'at')::bigint - 120000))), '[]') from jsonb_array_elements(ability_log) e)`);
  r = await as(dets[1], `select public.sniff('${K.id}') as x`);
  ok('Szimat: 30 mp-nél régebbi képességre „nem”', r.rows[0].x.used === false);

  // ---- Gyűlés
  ok('Gyűlés: a gyilkos nem kezdeményezhet', (await fails(killer, `select public.call_meeting('${K.id}')`)) !== null);
  await as(dets[0], `select public.call_meeting('${K.id}')`);
  ok('Gyűlés: nyomozónként csak 1', (await fails(dets[0], `select public.call_meeting('${K.id}')`)) !== null);
  ok('Gyűlés: közben nem lehet képességet használni', (await fails(killer, `select public.use_ability('${K.id}','vanish','{"cell":"B2"}')`)) !== null);
  ok('Gyűlés: a vita alatt még nincs szavazás', (await fails(dets[1], `select public.vote_meeting('${K.id}', '${killer}')`)) !== null);
  r = await S(dets[1], K.id);
  ok('Gyűlés: az állapot a vitát mutatja (30 mp), és hogy ki szavazott-e', r.meeting.phase === 'discuss' && r.meeting.voted === false && r.meeting.votes === undefined && r.meetingsLeft === 1);
  await shiftGame(G.id, `meeting = jsonb_set(meeting, '{endsAt}', to_jsonb(floor(extract(epoch from now()) * 1000)::bigint - 1000))`);
  r = await beat(dets[1], K.id);
  ok('Gyűlés: a vita lejártával szavazás indul (a beat előrelépteti)', r.meeting.phase === 'vote');
  ok('Gyűlés: magára nem szavazhat', (await fails(dets[1], `select public.vote_meeting('${K.id}', '${dets[1]}')`)) !== null);
  for (const d of dets) await as(d, `select public.vote_meeting('${K.id}', '${killer}')`);
  r = await S(killer, K.id);
  ok('Gyűlés: amíg a gyilkos nem szavazott, még nincs eredmény', r.meeting.phase === 'vote');
  await as(killer, `select public.vote_meeting('${K.id}', null)`);
  r = await S(dets[0], K.id);
  ok('Gyűlés: a gyilkosra szavazott többség → leleplezve', r.meeting.phase === 'result' && r.meeting.killerExposed === true && r.meeting.ejected === killer && r.exposedKillers[0] === killer);
  r = await as('postgres', `select exposed from public.room_roles where user_id = '${killer}'`); ok('Gyűlés: a gyilkos leleplezve (szerver)', r.rows[0].exposed === true);
  ok('leleplezett gyilkos nem használhat képességet', (await fails(killer, `select public.use_ability('${K.id}','vanish','{"cell":"B2"}')`)) !== null);
  const pen2 = (await as('postgres', `select penalty_ms from public.killer_games where id = ${G.id}`)).rows[0].penalty_ms;
  ok('leleplezés: +60 mp idő a csapatnak', Number(after) + 40000 /* 2 gyorsítás nem büntetés */ >= 0 && Number(pen2) === Number(after) - 60000);
  ev = await events(K.id, 'fx');
  ok('leleplezés: az `exposed` esemény kimegy', ev.some(e => e.payload.type === 'exposed'));
  await shiftGame(G.id, `meeting = null`);
  // második Gyűlés: ártatlan kiszavazása → néma + a gyilkos hűtése gyorsul
  await shiftGame(G.id, `cd = '{"textSwap": ${Date.now() - 1000}}'`);
  await as(dets[1], `select public.call_meeting('${K.id}')`);
  await shiftGame(G.id, `meeting = jsonb_set(jsonb_set(meeting, '{endsAt}', to_jsonb(floor(extract(epoch from now()) * 1000)::bigint - 1000)), '{phase}', '"discuss"')`);
  await beat(dets[1], K.id);
  for (const u of [killer, dets[1], dets[2]]) await as(u, `select public.vote_meeting('${K.id}', '${dets[0]}')`);
  await as(dets[0], `select public.vote_meeting('${K.id}', '${dets[2]}')`);
  r = await S(dets[0], K.id);
  ok('Gyűlés: ártatlanra szavazott többség → ő néma, nincs leleplezés', r.meeting.phase === 'result' && r.meeting.killerExposed === false && r.meeting.ejected === dets[0] && r.silencedMs > 0 && r.silencedMs <= 45000);
  ev = await events(K.id, 'fx');
  ok('néma: a `silenced` esemény 45 mp-es', ev.some(e => e.payload.type === 'silenced' && e.payload.userId === dets[0] && e.payload.ms === 45000));
  r = await as('postgres', `select (cd->>'textSwap')::bigint as t from public.killer_games where id = ${G.id}`);
  ok('ártatlan kiszavazása: a gyilkos hűtése 20 mp-cel korábbra kerül', Number(r.rows[0].t) <= Date.now() - 1000 - 19000);
  ok('Gyűlés: a keret elfogyott (2/játék)', (await S(dets[2], K.id)).meetingsLeft === 0);
  await shiftGame(G.id, `meeting = null`);

  // ---- közös beküldés: javaslat → a szavazók többsége jóváhagyja (mindenki szavazata EGYFORMÁN számít) → ellenőrzés → eredmény
  r = await as(dets[0], `select public.propose_submit('${K.id}') as id`);
  ok('beküldés: javaslat id-vel', typeof r.rows[0].id === 'string' && r.rows[0].id.length > 10);
  ok('beküldés: egyszerre egy javaslat', (await fails(dets[1], `select public.propose_submit('${K.id}')`)) !== null);
  await as(killer, `select public.vote_submit('${K.id}', true)`);
  r = await S(dets[1], K.id);
  ok('beküldés: a gyilkos jóváhagyása is csak egy szavazat — 2 a 4-ből még nem többség', r.submit.phase === 'vote' && r.submit.voted === false);
  await as(dets[1], `select public.vote_submit('${K.id}', true)`);
  r = await S(dets[2], K.id);
  ok('beküldés: 3 a 4-ből → többség jóváhagyta → ellenőrzés', r.submit.phase === 'verify');
  await as(dets[0], `select public.report_submit('${K.id}', false)`);
  await as(dets[1], `select public.report_submit('${K.id}', false)`);
  await as(killer, `select public.report_submit('${K.id}', true)`);   // a gyilkos jelentése ugyanúgy beleszámít (ezért nem szivároghat ki a szerepe a lezárás időzítéséből)
  r = await S(dets[2], K.id);
  ok('beküldés: amíg nem jelentett mindenki, nincs döntés', r.submit && r.submit.phase === 'verify' && r.lives === 2);
  await as(dets[2], `select public.report_submit('${K.id}', false)`);
  r = await S(dets[0], K.id);
  ok('beküldés: helytelen → egy élet vész, a játék megy tovább', r.lives === 1 && r.submit === null && r.phase === 'play');
  ev = await events(K.id, 'submit');
  ok('beküldés: az eredmény-esemény (wrong, hátralévő élet)', ev.some(e => e.payload.state === 'wrong' && e.payload.livesLeft === 1));
  // újabb javaslat: a nyomozók „helyes”-t jelentenek
  await as(dets[1], `select public.propose_submit('${K.id}')`);
  await as(dets[2], `select public.vote_submit('${K.id}', true)`);
  await as(dets[0], `select public.vote_submit('${K.id}', true)`);
  for (const d of all) await as(d, `select public.report_submit('${K.id}', true)`);
  r = await S(dets[0], K.id);
  ok('beküldés: helyes → Epilógus (20 mp), a játék még nem ért véget', r.phase === 'epilogue' && r.epilogue.endsAt > r.now && r.epilogue.voted === false);
  ev = await events(K.id, 'epilogue');
  ok('Epilógus: az esemény kimegy', ev.length === 1);
  ok('Epilógus: a nyomozó nem szavazhat magára', (await fails(dets[0], `select public.epilogue_vote('${K.id}', '${dets[0]}')`)) !== null);
  await as(killer, `select public.epilogue_vote('${K.id}', '${dets[0]}')`);   // a gyilkos szavazata nem számít
  await as(dets[0], `select public.epilogue_vote('${K.id}', '${killer}')`);
  await as(dets[1], `select public.epilogue_vote('${K.id}', '${killer}')`);
  r = await S(dets[2], K.id);
  ok('Epilógus: amíg nem szavazott mindenki, folytatódik', r.phase === 'epilogue');
  await as(dets[2], `select public.epilogue_vote('${K.id}', '${dets[1]}')`);
  r = await as('postgres', `select outcome, reason, ended_at from public.killer_games where id = ${G.id}`);
  ok('Epilógus: a nyomozók többsége a gyilkost nevezte meg → NYOMOZÓK GYŐZNEK', r.rows[0].outcome === 'detectives' && r.rows[0].reason === 'identified' && r.rows[0].ended_at !== null);
  r = await as('postgres', `select status from public.rooms where id = '${K.id}'`); ok('vég: a szoba visszaáll lobbyba', r.rows[0].status === 'lobby');
  r = await as('postgres', `select solved, ms from public.room_games where room_id = '${K.id}' order by id desc limit 1`); ok('vég: a statisztikai napló lezárul (megoldva)', r.rows[0].solved === true && r.rows[0].ms !== null);
  ev = await events(K.id, 'end');
  ok('vég: a végső esemény a gyilkost és a képesség-naplót is elárulja', ev.length === 1 && ev[0].payload.outcome === 'detectives' && ev[0].payload.killerIds[0] === killer && ev[0].payload.abilityLog.length === 5);
  r = await as(dets[0], `select public.killer_result('${K.id}') as x`);
  ok('killer_result: szerepek, gyilkos, napló', r.rows[0].x.outcome === 'detectives' && r.rows[0].x.killerIds[0] === killer && r.rows[0].x.roles[killer] === 'killer' && r.rows[0].x.abilityLog.length === 5);
  r = await as(out, `select public.killer_result('${K.id}') as x`); ok('killer_result: kívülálló nem látja', r.rows[0].x === null);
  r = await as(dets[0], `select public.killer_state('${K.id}') as s`); ok('vég után nincs futó játék', r.rows[0].s.running === false);
  ok('vég után nem használható képesség', (await fails(killer, `select public.use_ability('${K.id}','vanish','{"cell":"E3"}')`)) !== null);

  // ---- más vég-feltételek
  const startAgain = async (room) => { await as(u1, `select * from public.start_room('${room}')`); return (await as('postgres', `select id from public.killer_games where room_id = '${room}' and ended_at is null`)).rows[0].id; };
  // 1) lejár az idő
  let g2 = await startAgain(K.id);
  ok('új játék: az előző lezárt játék és szerepei megmaradnak, új szerepsorsolás', (await roles(g2)) && Object.keys(await roles(g2)).length === 4);
  await shiftGame(g2, `started_at = now() - interval '11 minutes'`);
  r = await beat(u2, K.id);
  r = await as('postgres', `select outcome, reason from public.killer_games where id = ${g2}`);
  ok('vég: lejárt az idő → A GYILKOS NYER', r.rows[0].outcome === 'killer' && r.rows[0].reason === 'time');
  // 2) elfogynak az életek
  g2 = await startAgain(K.id);
  const R2 = await roles(g2); const k2 = Object.keys(R2).find(x => R2[x] === 'killer'); const d2 = all.filter(u => u !== k2);
  await shiftGame(g2, 'lives = 1');
  await as(d2[0], `select public.propose_submit('${K.id}')`);
  await as(d2[1], `select public.vote_submit('${K.id}', true)`);
  await as(d2[2], `select public.vote_submit('${K.id}', true)`);
  for (const d of all) await as(d, `select public.report_submit('${K.id}', false)`);
  r = await as('postgres', `select outcome, reason from public.killer_games where id = ${g2}`);
  ok('vég: elfogyott az utolsó élet is → A GYILKOS NYER', r.rows[0].outcome === 'killer' && r.rows[0].reason === 'lives');
  // 3) döntetlen: helyes megoldás, de a gyilkos megúszta
  g2 = await startAgain(K.id);
  const R3 = await roles(g2); const k3 = Object.keys(R3).find(x => R3[x] === 'killer'); const d3 = all.filter(u => u !== k3);
  await as(d3[0], `select public.propose_submit('${K.id}')`);
  await as(d3[1], `select public.vote_submit('${K.id}', true)`);
  await as(d3[2], `select public.vote_submit('${K.id}', true)`);
  for (const d of all) await as(d, `select public.report_submit('${K.id}', true)`);
  await as(k3, `select public.epilogue_vote('${K.id}', '${d3[0]}')`);   // a gyilkos is „szavaz” — a kimenetelt a nyomozók szavazata dönti el
  for (const d of d3) await as(d, `select public.epilogue_vote('${K.id}', '${d3.find(x => x !== d)}')`);
  r = await as('postgres', `select outcome, reason from public.killer_games where id = ${g2}`);
  ok('vég: helyes megoldás, de rossz gyanúsított → DÖNTETLEN (a gyilkos megúszta)', r.rows[0].outcome === 'draw' && r.rows[0].reason === 'escaped');
  // 4) a tulajdonos megszakítja
  g2 = await startAgain(K.id);
  ok('megszakítás: csak a tulajdonos', (await fails(u2, `select public.finish_game('${K.id}', false, 0)`)) !== null);
  await as(u1, `select public.finish_game('${K.id}', false, 0)`);
  r = await as('postgres', `select outcome, reason from public.killer_games where id = ${g2}`);
  ok('megszakítás: a játék „aborted”, a szoba lobbyban', r.rows[0].outcome === 'aborted' && (await as('postgres', `select status from public.rooms where id = '${K.id}'`)).rows[0].status === 'lobby');
  // 5) a javaslat elutasítása és a várakozás
  g2 = await startAgain(K.id);
  const R5 = await roles(g2); const k5 = Object.keys(R5).find(x => R5[x] === 'killer'); const d5 = all.filter(u => u !== k5);
  await as(k5, `select public.propose_submit('${K.id}')`);
  await as(d5[0], `select public.vote_submit('${K.id}', false)`);
  await as(d5[1], `select public.vote_submit('${K.id}', false)`);
  r = await S(d5[2], K.id);
  ok('beküldés: a nyomozók elutasítják a gyilkos javaslatát → nincs függő javaslat', r.submit === null && r.lives === 2);
  ok('beküldés: az elutasítás után rövid várakozás — de CSAK a javaslattevőnek (nincs spam, a szoba mégsem foglalható el)', (await fails(k5, `select public.propose_submit('${K.id}')`)) !== null && (await as(d5[0], `select public.propose_submit('${K.id}') as id`)).rows[0].id.length > 10);
  // a Gyűlés félreteszi a szavazás alatti javaslatot
  await as(d5[1], `select public.call_meeting('${K.id}')`);
  r = await S(d5[2], K.id);
  ok('Gyűlés: a függő (szavazási szakaszú) beküldési javaslatot félreteszi, a Gyűlés elindul', r.submit === null && r.meeting && r.meeting.phase === 'discuss');
  await shiftGame(g2, `meeting = null`);
  ev = await events(K.id, 'submit');
  ok('beküldés: `rejected` esemény', ev.some(e => e.payload.state === 'rejected'));
  // 6) a gyilkos lecsatlakozik
  await as('postgres', `update public.room_roles set last_seen = now() - interval '5 minutes' where user_id = '${k5}' and game_id = ${g2}`);
  await beat(d5[0], K.id);
  r = await as('postgres', `select killer_gone from public.killer_games where id = ${g2}`);
  ok('lecsatlakozott gyilkos: a játék folytatódik képességek nélkül', r.rows[0].killer_gone === true);
  await beat(k5, K.id);   // visszatér (a saját szívverése frissíti az aktív állapotát)
  r = await as('postgres', `select killer_gone from public.killer_games where id = ${g2}`);
  ok('lecsatlakozott gyilkos: ha visszatér, a képességei is visszajönnek (nem végleges)', r.rows[0].killer_gone === false);
  await shiftGame(g2, `effect_until = null, global_cd_until = null, cd = '{}'`);
  ok('visszatért gyilkos újra használhat képességet', (await as(k5, `select public.use_ability('${K.id}','vanish','{"cell":"B2"}') as x`)).rows[0].x.ok === true);
  await as(u1, `select public.finish_game('${K.id}', false, 0)`);

  // ---- 2 játékos: a gyilkos kiléte nyilvános, nincs Gyűlés / Epilógus
  const D = await mk(u2, { timeLimit: 300 }, 3);
  await as(u3, `select * from public.join_room('${D.code}')`);
  await as(u2, `select * from public.start_room('${D.id}')`);
  const gD = (await as('postgres', `select id from public.killer_games where room_id = '${D.id}' and ended_at is null`)).rows[0].id;
  const RD = await roles(gD); const kD = Object.keys(RD).find(x => RD[x] === 'killer'); const dD = [u2, u3].find(x => x !== kD);
  r = await S(dD, D.id);
  ok('2 játékos: a nyomozó látja, ki a gyilkos', r.exposedKillers.length === 1 && r.exposedKillers[0] === kD && r.canCallMeeting === false);
  ok('2 játékos: nincs Gyűlés', (await fails(dD, `select public.call_meeting('${D.id}')`)) !== null);
  await as(dD, `select public.propose_submit('${D.id}')`);   // egy nyomozó: a saját javaslata azonnal többség
  r = await S(dD, D.id);
  ok('2 játékos: a nyomozó javaslata azonnal ellenőrzésre kerül', r.submit.phase === 'verify');
  await as(dD, `select public.report_submit('${D.id}', true)`);
  r = await as('postgres', `select outcome from public.killer_games where id = ${gD}`);
  ok('2 játékos: helyes megoldás → a nyomozó nyer, Epilógus nélkül', r.rows[0].outcome === 'detectives');

  // ---- 6 játékos: két gyilkos
  const six = [u1, u2, u3, u4, '77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888'];
  await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values ('${six[4]}', 'g@x.hu', '{"username":"Hatodik"}'), ('${six[5]}', 'h@x.hu', '{"username":"Hetedik"}')`);
  const X = await mk(u1, { killerCount: 2 }, 6);
  for (const u of six.slice(1)) await as(u, `select * from public.join_room('${X.code}')`);
  await as(u1, `select * from public.start_room('${X.id}')`);
  const gX = (await as('postgres', `select id from public.killer_games where room_id = '${X.id}' and ended_at is null`)).rows[0].id;
  ok('6 játékos: kettő gyilkos is lehet', Object.values(await roles(gX)).filter(x => x === 'killer').length === 2);
  r = await as('postgres', `select (cfg->'timeLimit') is null or cfg->>'timeLimit' is null as nolimit from public.killer_games where id = ${gX}`);
  ok('időkorlát nélküli játék: nincs hátralévő idő', (await S(u1, X.id)).timeLimitMs === null);
  const kx = Object.keys(await roles(gX)).find(x => true);
  const anyKiller = Object.entries(await roles(gX)).find(([, v]) => v === 'killer')[0];
  ok('időkorlát nélkül az Időcsavar nem használható', (await fails(anyKiller, `select public.use_ability('${X.id}','timeWarp','{"mode":"steal"}')`)) !== null);
  await as(u1, `select public.finish_game('${X.id}', false, 0)`);

  // ---- ellenőrzői javítások
  {
    // (1) a szavazás kimenetele NEM függhet a szereptől: 3 játékos, a megfigyelő nyomozó egyetlen jóváhagyása ugyanúgy hat, akárki a javaslattevő
    const M = await mk(u1, { timeLimit: 600 }, 3);
    await as(u2, `select * from public.join_room('${M.code}')`); await as(u3, `select * from public.join_room('${M.code}')`);
    const outcomeOf = async (proposerRole) => {
      await as(u1, `select * from public.start_room('${M.id}')`);
      const gm = (await as('postgres', `select id from public.killer_games where room_id = '${M.id}' and ended_at is null`)).rows[0].id;
      const three = [u1, u2, u3];
      await as('postgres', `update public.room_roles set role = case when user_id = '${u3}' then 'killer' else 'detective' end where game_id = ${gm}`);   // próba-elrendezés: u3 a gyilkos
      const proposer = proposerRole === 'killer' ? u3 : u1;
      const observer = u2;
      await as(proposer, `select public.propose_submit('${M.id}')`);
      await as(observer, `select public.vote_submit('${M.id}', true)`);
      const phase = (await S(observer, M.id)).submit?.phase ?? null;
      await as(u1, `select public.finish_game('${M.id}', false, 0)`);
      return phase;
    };
    ok('szerep-szivárgás: a gyilkos és a nyomozó javaslata ugyanarra jut egy megfigyelő egyetlen szavazatával (nem derül ki, ki a gyilkos)', (await outcomeOf('killer')) === (await outcomeOf('detective')) && (await outcomeOf('detective')) === 'verify');
    await as(u1, `select public.delete_room('${M.id}')`);   // (legfeljebb 5 saját szoba)
  }
  {
    // (2) a hallgatás nem beleegyezés: lejáratkor a kisebbségi jóváhagyás nem megy át
    const M = await mk(u1, { timeLimit: 600 }, 4);
    for (const u of [u2, u3, u4]) await as(u, `select * from public.join_room('${M.code}')`);
    await as(u1, `select * from public.start_room('${M.id}')`);
    const gm = (await as('postgres', `select id from public.killer_games where room_id = '${M.id}' and ended_at is null`)).rows[0].id;
    const Rm = await roles(gm); const km = Object.keys(Rm).find(x => Rm[x] === 'killer'); const dm = all.filter(u => u !== km);
    await as(dm[0], `select public.propose_submit('${M.id}')`);
    await shiftGame(gm, `submit = jsonb_set(submit, '{endsAt}', to_jsonb(floor(extract(epoch from now()) * 1000)::bigint - 1000))`);
    r = await beat(dm[1], M.id);
    ok('beküldés: lejáratkor a kisebbségi (1/4) jóváhagyás NEM megy át (a hallgatás nem beleegyezés)', r.submit === null && r.lives === 3);
    // (3) az ajtó: a zárt ajtójú szoba indításkor kinyílik, a tagok látják az eseményeket
    await as(u1, `select public.finish_game('${M.id}', false, 0)`);
    await as(u1, `select public.set_room_open('${M.id}', false)`);
    await as(u1, `select * from public.start_room('${M.id}')`);
    ok('indítás: a zárt ajtó kinyílik (a nem tulajdonos tagok is látják a szobát és az eseményeket)', (await as(u2, `select count(*)::int n from public.room_events where room_id = '${M.id}'`)).rows[0].n >= 1 && (await as(u2, `select count(*)::int n from public.rooms where id = '${M.id}'`)).rows[0].n === 1);
    // (4) a leleplezett gyilkos újabb kiszavazása nem ad újabb időt
    const g4 = (await as('postgres', `select id from public.killer_games where room_id = '${M.id}' and ended_at is null`)).rows[0].id;
    const R4 = await roles(g4); const k4 = Object.keys(R4).find(x => R4[x] === 'killer'); const d4 = all.filter(u => u !== k4);
    const expose = async (caller) => {
      await as(caller, `select public.call_meeting('${M.id}')`);
      await shiftGame(g4, `meeting = jsonb_set(jsonb_set(meeting, '{endsAt}', to_jsonb(floor(extract(epoch from now()) * 1000)::bigint - 1000)), '{phase}', '"discuss"')`);
      await beat(caller, M.id);
      for (const d of d4) await as(d, `select public.vote_meeting('${M.id}', '${k4}')`);
      await as(k4, `select public.vote_meeting('${M.id}', null)`);
      await shiftGame(g4, `meeting = null`);
    };
    await expose(d4[0]);
    const p1 = Number((await as('postgres', `select penalty_ms from public.killer_games where id = ${g4}`)).rows[0].penalty_ms);
    await expose(d4[1]);
    const p2 = Number((await as('postgres', `select penalty_ms from public.killer_games where id = ${g4}`)).rows[0].penalty_ms);
    ok('leleplezés: az első kiszavazás +60 mp, a már leleplezett gyilkos újabb kiszavazása nem ad még', p1 === -60000 && p2 === -60000);
    // (5) időrend: a lejárt idő előtti határidejű ellenőrzés előbb zárul le, mint az idő-lejárat
    await shiftGame(g4, `submit = jsonb_build_object('id', 'x', 'by', '${d4[0]}', 'phase', 'verify', 'endsAt', floor(extract(epoch from now()) * 1000)::bigint - 8000, 'approve', '[]'::jsonb, 'reject', '[]'::jsonb, 'reports', jsonb_build_object('${d4[0]}', false, '${d4[1]}', false, '${d4[2]}', false, '${k4}', false)), started_at = now() - interval '603 seconds', penalty_ms = 0`);
    await beat(d4[0], M.id);
    ev = await events(M.id, 'submit');
    r = await as('postgres', `select outcome, reason from public.killer_games where id = ${g4}`);
    ok('időrend: az idő lejárta előtti határidejű beküldés előbb dől el (életvesztés), csak utána jön az idő-lejárat', ev.some(e => e.payload.state === 'wrong') && r.rows[0].outcome === 'killer' && r.rows[0].reason === 'time');
    await as(u1, `select public.delete_room('${M.id}')`);
  }
  {
    // (6) hibás beállítás nem ejti el az indítást: rossz szám / szöveg / óriási érték alapértékre / tartományba kerül
    const M = await mk(u1, { lives: 'abc', timeLimit: 1e30, meetings: 'NaN', cooldownScale: 'x', showPlacers: 'talán', abilities: { vanish: 'nope' } }, 3);
    await as(u2, `select * from public.join_room('${M.code}')`);
    await as(u1, `select * from public.start_room('${M.id}')`);
    const cfg = (await as('postgres', `select cfg from public.killer_games where room_id = '${M.id}' and ended_at is null`)).rows[0].cfg;
    ok('hibás beállítások: alapérték / tartományba vágás, az indítás nem hibázik', cfg.lives === 3 && cfg.timeLimit === 7200 && cfg.meetings === 6 && cfg.cooldownScale === 1 && cfg.showPlacers === false && cfg.abilities.vanish === true, JSON.stringify(cfg));
    await as(u1, `select public.delete_room('${M.id}')`);
  }

  // ---- a Együtt mód változatlan, a közös start_room továbbra is működik
  const T = (await as(u1, `select * from public.create_room('together','classic-01',3::smallint,'{}')`)).rows[0];
  await as(u1, `select public.set_room_open('${T.id}', true)`);
  r = await as(u1, `select * from public.start_room('${T.id}')`);
  ok('Együtt mód: a start_room változatlanul megy, szerepek nélkül', r.rows[0].status === 'playing' && (await as('postgres', `select count(*)::int n from public.killer_games where room_id = '${T.id}'`)).rows[0].n === 0);
  await as(u1, `select public.finish_game('${T.id}', true, 1000)`);
  r = await as('postgres', `select solved from public.room_games where room_id = '${T.id}'`); ok('Együtt mód: a finish_game változatlan', r.rows[0].solved === true);
}

{
  const pub = await as('postgres', "select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1");
  const got = pub.rows.map(x => x.tablename).join(',');
  ok('Realtime-publikációban benne van a 6 social tábla', ['friendships', 'room_invites', 'room_members', 'room_messages', 'rooms', 'room_events'].every(t => got.split(',').includes(t)), got);
  console.log('');
}
{
  // 0008 — biztonsági megerősítés
  const bad = async (who, sql) => (await fails(who, sql)) !== null;
  const u9 = '99999999-9999-9999-9999-999999999999';
  await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values ('${u9}', 'i@x.hu', '{"username":"Tesztelo9"}')`);
  console.log('0008:');
  ok('0008: az XP nem ugorhat az egekbe (korlát)', await bad(u9, `update public.profiles set xp = 9000000 where id = '${u9}'`));
  ok('0008: az XP-ugrás egy módosításban korlátos', await bad(u9, `update public.profiles set xp = 500000 where id = '${u9}'`));
  ok('0008: a normális XP-növekedés megy', (await as(u9, `update public.profiles set xp = 400, coins = 30 where id = '${u9}' returning xp`)).rows[0].xp === 400);
  ok('0008: láthatatlan karakteres becenév elutasítva', await bad(u9, `update public.profiles set username = 'Abc' || chr(8203) where id = '${u9}'`));
  ok('0008: lemaradó szóközös becenév elutasítva', await bad(u9, `update public.profiles set username = 'Abcd ' where id = '${u9}'`));
  ok('0008: a rendes átnevezés megy', (await as(u9, `update public.profiles set username = 'Tesztelo_9' where id = '${u9}' returning username`)).rows[0].username === 'Tesztelo_9');
  ok('0008: futás-napló: negatív idő elutasítva', await bad(u9, `insert into public.runs (id, user_id, puzzle_ref, kind, solved, time_ms) values (gen_random_uuid(), '${u9}', 'x', 'catalog', true, -5)`));
  ok('0008: futás-napló: irreális tipp-szám elutasítva', await bad(u9, `insert into public.runs (id, user_id, puzzle_ref, kind, solved, hints_used) values (gen_random_uuid(), '${u9}', 'x', 'catalog', true, 5000)`));
  ok('0008: futás-napló: normális sor megy', (await as(u9, `insert into public.runs (id, user_id, puzzle_ref, kind, solved, time_ms) values (gen_random_uuid(), '${u9}', 'x', 'catalog', true, 60000) returning 1`)).rows.length === 1);
  ok('0008: óriási mentés elutasítva', await bad(u9, `insert into public.saves (user_id, puzzle_ref, state) values ('${u9}', 'x', jsonb_build_object('x', repeat('a', 300000)))`));
  ok('0008: normális mentés megy', (await as(u9, `insert into public.saves (user_id, puzzle_ref, state) values ('${u9}', 'x', '{"placed":{}}') returning 1`)).rows.length === 1);
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  ok('0008: submit_score: távoli jövőbeli tábla elutasítva', await bad(u9, `select public.submit_score('daily:${day(40)}', 90000, 0::smallint)`));
  ok('0008: submit_score: régi tábla elutasítva', await bad(u9, `select public.submit_score('daily:${day(-40)}', 90000, 0::smallint)`));
  ok('0008: submit_score: irreális tipp-szám elutasítva', await bad(u9, `select public.submit_score('daily:${day(0)}', 90000, 500::smallint)`));
  ok('0008: submit_score: mai tábla megy', !(await bad(u9, `select public.submit_score('daily:${day(0)}', 90000, 0::smallint)`)));
  ok('0008: a barát-kód generátor anonként nem hívható', await bad('anon', 'select public.new_friend_code()'));
  ok('0008: a belső implementációs függvények kliensként nem hívhatók', (await bad(u9, "select * from public._join_room_impl('AAAAAA')")) && (await bad(u9, "select public._rate_limit('x', 1, interval '1 minute')")));
  // chat-árasztás: legfeljebb 12 üzenet / 10 mp
  const cr = (await as(u9, `select * from public.create_room('together', 'classic-1-01', 2::smallint, '{}')`)).rows[0];
  for (let i = 0; i < 12; i++) await as(u9, `insert into public.room_messages (room_id, user_id, body) values ('${cr.id}', '${u9}', 'üzenet ${i}')`);
  ok('0008: chat-árasztás: a 13. üzenet 10 mp-en belül elutasítva', await bad(u9, `insert into public.room_messages (room_id, user_id, body) values ('${cr.id}', '${u9}', 'spam')`));
  ok('0008: a chat időbélyegét a szerver adja', (await db.query(`select count(*)::int n from public.room_messages where room_id = '${cr.id}' and created_at < now() - interval '1 minute'`)).rows[0].n === 0);
  // szoba-kód próbálgatás: legfeljebb 30 keresés / perc
  let allowed = 0;
  for (let i = 0; i < 35; i++) if (!(await bad(u9, "select * from public.room_peek('ZZZZZZ')"))) allowed++;
  ok('0008: a szoba-kód keresése percenként korlátos (35 próbából legfeljebb 30 megy)', allowed <= 30 && allowed >= 25, String(allowed));
  ok('0008: join_room is a közös korlát alatt van', await bad(u9, "select * from public.join_room('ZZZZZZ')"));
}
console.log(`\n${pass} sikeres, ${fail} sikertelen`);
process.exit(fail ? 1 : 0);
