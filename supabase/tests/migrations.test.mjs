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
await as(u1, `select public.leave_room('${room.id}')`);
r = await as('postgres', `select host_id from public.rooms where id = '${room.id}'`); ok('host kilép -> a másik tag lesz a host', r.rows[0].host_id === u2);
await as(u2, `select public.leave_room('${room.id}')`);
r = await as('postgres', `select status from public.rooms where id = '${room.id}'`); ok('az utolsó tag kilép -> a szoba lezárul', r.rows[0].status === 'closed');
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
  ok('search_profiles: saját magamat nem adja', !(await as(u2, `select * from public.search_profiles('${n2.slice(0, 3)}')`)).rows.some(x => x.id === u2));
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
  ok('submit_score: irreálisan gyors idő elutasítva', (await fails(u1, "select public.submit_score('daily:2026-10-25', 500, 0::smallint)")) !== null);
  ok('a ranglista közvetlenül nem írható', (await fails(u1, `insert into public.leaderboard (board, user_id, time_ms) values ('daily:2026-10-25','${u1}', 4000)`)) !== null);
  await as(u1, "select public.submit_score('daily:2026-10-25', 90000, 1::smallint)");
  await as(u2, "select public.submit_score('daily:2026-10-25', 80000, 0::smallint)");
  await as(u1, "select public.submit_score('daily:2026-10-25', 95000, 0::smallint)");
  r = await as('postgres', `select time_ms from public.leaderboard where user_id = '${u1}'`); ok('submit_score: a rosszabb idő nem írja felül a jobbat', r.rows[0].time_ms === 90000);
  await as(u1, "select public.submit_score('daily:2026-10-25', 70000, 0::smallint)");
  await as(u3, "select public.submit_score('daily:2026-10-25', 60000, 0::smallint)");
  r = await as(u1, "select username, time_ms from public.leaderboard_top('daily:2026-10-25', 10)");
  ok('leaderboard_top: javuló idő, sorrend, a nem kereshető profil rejtve', r.rows.map(x => x.time_ms).join() === '70000,80000');
  r = await as(u3, "select time_ms from public.leaderboard_top('daily:2026-10-25', 10)"); ok('leaderboard_top: a nem kereshető a saját sorát látja', r.rows[0].time_ms === 60000);

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

{
  const pub = await as('postgres', "select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1");
  const got = pub.rows.map(x => x.tablename).join(',');
  ok('Realtime-publikációban benne van az 5 social tábla', ['friendships', 'room_invites', 'room_members', 'room_messages', 'rooms'].every(t => got.split(',').includes(t)), got);
  console.log('');
}
console.log(`\n${pass} sikeres, ${fail} sikertelen`);
process.exit(fail ? 1 : 0);
