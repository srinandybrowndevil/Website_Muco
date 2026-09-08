# MUCO LABS — Supabase + Vercel முழுமையான setup guide

இந்த repository-க்கு இரண்டு Vercel projects, ஒரு Supabase project தேவை. Website-ஐயும் CRM-ஐயும் தனித்தனியாக deploy செய்ய வேண்டும். ஒரே GitHub repository-ஐ இரண்டு Vercel projects-க்கும் import செய்யலாம். [Vercel monorepo வழிகாட்டி](https://vercel.com/docs/monorepos)

| பகுதி | Code இருக்கும் இடம் | Production address உதாரணம் |
|---|---|---|
| Public website + enquiry / analytics API | Repository root | `https://mucolabs.com` |
| Staff CRM + customer portal | `portal/` | `https://portal.mucolabs.com` |
| Database + login + private files + Realtime | Supabase | Supabase தரும் project URL |

இந்த addresses deployment plan. DNS / hosting ஏற்கெனவே இயங்குவதாக இந்த guide உறுதி செய்யவில்லை.

## 1. இப்போது செய்யப்பட்ட வேலை; இன்னும் செய்ய வேண்டியது

- ஆறு featured projects-க்கும் photorealistic AI illustrations உருவாக்கப்பட்டுள்ளன. Original PNG: `project-images/`; optimized responsive images: `assets/projects/`. எல்லா cover images-லும் “AI-generated illustration” label உள்ளது. பழைய உண்மையான MUCO screen recording project details-ல் உள்ளது.
- Supabase configuration இருக்கும் CRM-ல் dashboard, leads, customers, follow-ups, projects, proposal/invoice records, reports, files, team invitations ஆகியவை sample data-க்கு பதிலாக database records பயன்படுத்துகின்றன.
- Database changes மூலம் live refresh; connection தடங்கல் இருந்தால் 30-second refresh மற்றும் tab focus / reconnect refresh உள்ளன.
- Customer account அதன் projects, proposals, invoices, shared files மட்டும் பார்க்கும் வகையில் புதிய RLS migration உள்ளது. Private signed download links 60 seconds மட்டுமே செல்லுபடியாகும்.
- Automation பகுதியில் “new lead → next-day follow-up task” rule உண்மையாக database trigger மூலம் செயல்படும். Admin அதை enable/disable செய்யலாம்.

**இந்த session-ல் செய்த read-only Supabase check:** basic CRM tables HTTP 200 தந்தன. `project_requests`, `website_enquiries`, `analytics_events` HTTP 404 தந்தன. அதாவது தேவையான migrations அந்த connected database-ல் இன்னும் இல்லை அல்லது API schema cache-ல் தெரியவில்லை. Core table HTTP 200 வந்தது மட்டும் admin, RLS அல்லது Realtime சரியாக setup ஆகியுள்ளது என்பதற்குச் சான்றல்ல.

Production deploy, DNS change, migrations apply, real signup/email delivery, இரண்டு real accounts இடையிலான access test ஆகியவை இந்த code update மூலம் தானாக முடிவதில்லை. கீழே உள்ள படிகளை முடித்த பின்னரே முழுமையான live operation-ஐ உறுதி செய்யலாம். இந்த workspace-ல் service-role key இருந்தாலும் application அதை browser-ல் பயன்படுத்தவில்லை; இந்த setup-க்கு அந்த key-ஐ Vercel-ல் சேர்க்க வேண்டியதில்லை.

## 2. GitHub-க்கு அனுப்புவதற்கு முன்

1. உங்களுடைய repository-யைத் திறந்து மாற்றங்களை review செய்யவும். Existing uncommitted changes-ஐயும் சேர்த்து review செய்ய வேண்டும்.
2. `.env`, `.env.local`, `portal/.env`, `portal/.env.local`, service-role keys ஆகியவற்றை commit செய்ய வேண்டாம். `.env.example` files மட்டும் placeholders உடன் இருக்க வேண்டும்.
3. `assets/projects/` (generated), generated HTML files, CSS/JS, scripts, `portal/` code, migrations, lockfile ஆகியவற்றைச் சேர்க்கவும். `.next`, `node_modules`, `.qa`, `public-site` போன்ற output/cache folders commit செய்யத் தேவையில்லை. `project-images/*.png` source illustrations இப்போது gitignore செய்யப்பட்டுள்ளன (ஒவ்வொன்றும் ~2 MB, எதுவும் serve ஆவதில்லை); `project-images/PROMPTS.md` மட்டும் track ஆகும்.
4. Website source மாற்றியிருந்தால் root folder-ல்:

```powershell
python build.py
node scripts/build-site.mjs
node --test test-lead.mjs test-event.mjs
```

5. CRM checks:

```powershell
cd portal
npm ci
npm run lint
npm test
npm run build
```

`npm` command கிடைக்கவில்லை என்றால் Node.js LTS-ஐ நிறுவி புதிய terminal திறக்கவும். இந்த session checks bundled Node மூலம் செய்யப்பட்டன.

## 3. Supabase project மற்றும் keys

1. [Supabase Dashboard](https://supabase.com/dashboard)-ல் sign in செய்யவும்.
2. Existing MUCO CRM project இருந்தால் அதையே திறக்கவும். வேறு project உருவாக்கினால் website மற்றும் portal இரண்டிற்கும் அந்த ஒரே project-ன் URL/key பயன்படுத்த வேண்டும்.
3. புதிய project என்றால் New project → organization → project name → வலுவான database password → பொருத்தமான region → Create project.
4. Project Connect / Settings → API பகுதியில் **Project URL** மற்றும் **Publishable key** எடுக்கவும். Legacy project என்றால் `anon` key பயன்படுத்தலாம்.
5. `service_role` அல்லது `sb_secret_...` key-ஐ `NEXT_PUBLIC_` variable-ல் எப்போதும் வைக்க வேண்டாம். Publishable/anon key browser-க்கு அனுமதிக்கப்பட்டது; database பாதுகாப்பு RLS மூலம் அமல்படுத்தப்படுகிறது. [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)

## 4. Database migrations — மிக முக்கியமான படி

Fresh database-ல் `portal/supabase/migrations/` folder-லுள்ள **இந்த ஏழு files-ஐ இதே வரிசையில்** apply செய்யவும்:

1. `20261012000000_crm_schema.sql`
2. `20261013000000_auth_invitations.sql`
3. `20261014000000_customer_requests.sql`
4. `20261015000000_website_monitoring.sql`
5. `20261016000000_security_fixes.sql`
6. `20261017000000_live_workspace.sql`
7. `20261018000000_analytics_retention.sql`

ஏழாவது migration-க்கு **pg_cron** தேவை. அதற்கு முன் Dashboard → Database →
Extensions → `pg_cron` enable செய்யவும். Enable செய்யாமல் run செய்தால் migration
success ஆகும், ஆனால் `WARNING` வரும், analytics events **எப்போதும் delete ஆகாது** —
அப்படியானால் privacy.html சொல்லும் "90 days then deleted automatically" உண்மையல்ல.
Enable செய்த பிறகு அந்த file-ஐ மீண்டும் run செய்யவும். சரிபார்க்க:

```sql
select jobname, schedule, active from cron.job where jobname = 'purge-analytics-events';
```

Filename date என்பது வரிசைப்படுத்தும் identifier; நாளை வரும்வரை காத்திருக்கத் தேவையில்லை.

**Dashboard முறை:** SQL Editor → New query → ஒரு file-ன் முழு SQL-ஐ paste → Run → success உறுதி → அடுத்த file. Error வந்தால் அடுத்த file-க்கு போகாமல் அதைச் சரிசெய்யவும். புதிய migration transaction-ல் ஓடும்; நடுவில் error என்றால் அதன் மாற்றங்கள் rollback ஆகும்.

**Existing database:** முதல் migration-ஐ மீண்டும் run செய்ய வேண்டாம். `type already exists`, `table already exists` போன்ற errors வரும். முதலில் இந்த read-only SQL மூலம் தற்போதைய நிலையைப் பார்க்கவும்:

```sql
select
  to_regclass('public.leads') as core_crm,
  to_regclass('public.invitations') as invitations,
  to_regclass('public.project_requests') as customer_requests,
  to_regclass('public.website_enquiries') as enquiries,
  to_regclass('public.analytics_events') as analytics;

select to_regprocedure('public.crm_schema_version()') as live_migration;
```

Core CRM இருந்தும் மற்ற tables இல்லாவிட்டால் **missing migration-ல் இருந்து** தொடரவும். ஒரு table இருப்பது மட்டும் அந்த migration முழுவதும் முடிந்ததற்குச் சான்றல்ல; partially applied file இருந்தால் அதன் functions/policies/triggers-ஐயும் SQL Editor-ல் பார்க்கவும். Existing data இருந்தால் முதலில் backup அல்லது staging copy வைத்துக் கொள்ளவும்.

Supabase CLI ஏற்கெனவே migration history-ஐ நிர்வகிக்கும் project என்றால்:

```powershell
cd portal
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase migration list
supabase db push
```

CLI வழியில் project config தேவைப்பட்டால் `supabase init` ஒருமுறை செய்யவும். ஏற்கெனவே SQL Editor மூலம் apply செய்யப்பட்ட migration-ஐ CLI history இல்லாமல் மீண்டும் push செய்ய வேண்டாம்; history-ஐ reconcile செய்தபிறகு தொடரவும். [Supabase migrations](https://supabase.com/docs/guides/deployment/database-migrations)

எல்லாம் முடிந்தபின்:

```sql
select public.crm_schema_version(); -- 7 வர வேண்டும்

select tablename
from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
order by tablename;

select id, public, file_size_limit
from storage.buckets where id = 'crm-files';
-- public=false; file_size_limit=10485760
```

`supabase_realtime` publication-ல் CRM tables சேர்க்கப்பட வேண்டும். புதிய migration அதைச் செய்கிறது. Dashboard → Database → Publications-ல் சரிபார்க்கலாம். RLS-ஐ disable செய்ய வேண்டாம். [Realtime Postgres changes](https://supabase.com/docs/guides/realtime/postgres-changes)

## 5. முதல் administrator உருவாக்குவது

1. Supabase → Authentication → Users → Add user / Create user.
2. உங்களுடைய உண்மையான admin email மற்றும் password கொடுக்கவும். நீங்கள் கட்டுப்படுத்தும் account-க்கு email confirmed அமைக்கவும்.
3. Public `/signup` மூலம் உருவாக்கப்படும் account customer role பெறும். அதைப் பயன்படுத்தி staff access தானாகக் கிடைக்காது.
4. கீழுள்ள SQL-ல் `YOUR_ADMIN_EMAIL`-ஐ மாற்றி SQL Editor-ல் run செய்யவும்:

```sql
do $$
declare
  admin_id uuid;
  org_id uuid;
begin
  select id into admin_id from auth.users
  where lower(email) = lower('YOUR_ADMIN_EMAIL');
  if admin_id is null then
    raise exception 'Create the admin user in Authentication first';
  end if;

  insert into public.organizations(name, slug)
  values('MUCO LABS', 'muco-labs')
  on conflict(slug) do nothing;
  select id into org_id from public.organizations where slug='muco-labs';

  insert into public.profiles(id, full_name)
  values(admin_id, 'MUCO Administrator')
  on conflict(id) do nothing;

  insert into public.memberships(organization_id, user_id, role)
  values(org_id, admin_id, 'admin')
  on conflict(organization_id, user_id) do update set role='admin';
end $$;
```

Organization slug **`muco-labs`** ஆக இருக்க வேண்டும். Customer onboarding மற்றும் website ingestion இதைப் பயன்படுத்துகின்றன. இந்த admin bootstrap-ஐ பொதுமக்களுக்கு திறந்த RPC ஆக மாற்ற வேண்டாம்.

## 6. Login emails, redirect URLs, SMTP

1. Authentication → Sign-in providers / Email: Email login மற்றும் signup enable செய்யவும்; customer email confirmation enable ஆக இருக்க வேண்டும்.
2. Authentication → URL Configuration → Site URL:

```text
https://portal.mucolabs.com
```

3. Redirect allowlist-ல் deployed CRM callback-ஐச் சேர்க்கவும்:

```text
https://portal.mucolabs.com/auth/callback
http://localhost:3000/**
http://127.0.0.1:3000/**
```

Production domain இன்னும் இல்லாவிட்டால் CRM project-ன் stable `https://YOUR-CRM.vercel.app` origin-ஐ Site URL-ஆகவும் அதன் `/auth/callback`-ஐ allowlist-லும் பயன்படுத்தவும். Preview deployment test செய்யும்போது உங்கள் team-க்கு மட்டும் பொருந்தும் preview URL pattern பயன்படுத்தவும். Wildcard external domains-ஐ production allowlist-ல் சேர்க்க வேண்டாம். [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)

4. Authentication → Email / SMTP settings: உங்கள் verified sender provider-ன் SMTP host, port, username, password, sender email சேர்க்கவும். Custom SMTP configure செய்தபின் signup, recovery, magic link delivery-ஐச் சோதிக்கவும். Supabase default email service production delivery-க்கான முழுமையான மாற்று அல்ல. [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
5. Email templates default confirmation links-ஐ வைத்திருக்கலாம். இந்த app `/auth/callback?code=...` PKCE exchange பயன்படுத்துகிறது. App-ல் இல்லாத `/auth/confirm` route-க்கு templates மாற்ற வேண்டாம்.
6. Recovery link / magic link கோரிய அதே browser-ல் email link திறந்து முதலில் test செய்யவும்; PKCE verifier அந்த browser-ல் இருக்கும். வேறு browser-ல் expired/invalid callback என்றால் புதிய link கோரவும்.

## 7. Vercel project 1 — public website

1. [Vercel](https://vercel.com/new) → Add New Project → GitHub repository import.
2. Project name உதாரணம்: `muco-website`.
3. **Root Directory:** repository root (`./`), `portal` அல்ல.
4. **Framework Preset:** Other.
5. Root `vercel.json` ஏற்கெனவே கீழே உள்ள settings தருகிறது:

| Setting | Value |
|---|---|
| Build Command | `node scripts/build-site.mjs` |
| Output Directory | `public-site` |
| Install Command | Empty override; root build has no npm dependencies |
| Node runtime | Vercel-ல் ஆதரிக்கப்படும் LTS version |

6. Environment Variables:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
RESEND_API_KEY=OPTIONAL_RESEND_KEY
LEAD_TO_EMAIL=YOUR_RECEIVING_EMAIL
LEAD_FROM_EMAIL=YOUR_VERIFIED_RESEND_SENDER
```

Supabase public values website API-க்கும் CRM-க்கும் ஒரே project-ல் இருந்து இருக்க வேண்டும். `RESEND_API_KEY` இல்லாவிட்டாலும் accepted lead function log-ல் பதிவாகும்; Supabase tables setup ஆனபின் CRM-லும் சேமிக்கப்படும். Resend இல்லாமல் notification email அனுப்பப்படாது.

7. Deploy அழுத்தவும். Build logs-ல் public files packaged என்ற message பார்க்கவும்.
8. Deployment → Functions-ல் `/api/lead`, `/api/event` இருப்பதைச் சரிபார்க்கவும். `api/` functions repository root-ல் இருக்க வேண்டும்; அவற்றை static output folder-க்கு copy செய்ய வேண்டாம். [Vercel Node functions](https://vercel.com/docs/functions/runtimes/node-js)
9. Contact form-ல் ஒரு தெளிவான test enquiry அனுப்பவும்; CRM `/enquiries`-ல் அது வந்ததா பார்க்கவும். WhatsApp draft திறப்பதும் database-ல் record இருப்பதும் இரண்டு தனித்தனி checks.

`build.py` Vercel build-ல் ஓடுவதில்லை. Python sources மாற்றியபின் local-ல் regenerate செய்து generated files-ஐ GitHub-க்கு push செய்ய வேண்டும். Asset packaging script website files மட்டும் publish செய்கிறது; portal source, SQL, env files, original PNGs static web root-ல் சேராது.

## 8. Vercel project 2 — CRM / customer portal

1. அதே GitHub repository-ஐ மீண்டும் Add New Project மூலம் import செய்யவும்.
2. Project name: `muco-crm`.
3. **Root Directory:** `portal`.
4. **Framework Preset:** Next.js.
5. Install Command: `npm ci`; Build Command: `npm run build`; Output Directory: Next.js default. Root website-ன் `public-site` output-ஐ இங்கு பயன்படுத்த வேண்டாம்.
6. Environment Variables:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL=https://portal.mucolabs.com
```

7. Production / Preview environments-ல் தேவையான variables சேர்க்கவும். Public variables build நேரத்தில் bundle ஆகுவதால் values மாற்றியபின் **Redeploy** செய்யவும்.
8. Deploy → `/login` → admin account-ல் sign in. Empty database என்றால் zero totals / empty states வருவது சரியான behavior; sample revenue காட்டக் கூடாது.
9. புதிய live migration இல்லாவிட்டால் workspace setup error காட்டும். அந்த guard-ஐ நீக்காமல் database setup-ஐ முடிக்கவும்.

## 9. Domain / DNS

1. Website Vercel project → Settings → Domains → `mucolabs.com`, தேவையெனில் `www.mucolabs.com` சேர்க்கவும்.
2. CRM project → Settings → Domains → `portal.mucolabs.com` சேர்க்கவும்.
3. Domain registrar DNS-ல் Vercel காட்டும் exact A/CNAME/verification records-ஐ சேர்க்கவும். Fixed IP-ஐ இந்த guide-லிருந்து ஊகித்து copy செய்ய வேண்டாம்.
4. Existing email MX/TXT records-ஐ மாற்ற வேண்டாம். ஒரே hostname-க்கு conflict ஆகும் பழைய web record இருந்தால் மட்டும் சரியான record-ஆக மாற்றவும்.
5. Vercel valid configuration / HTTPS ready காட்டும் வரை காத்திருக்கவும். பின்னர் Supabase Site URL மற்றும் redirect allowlist final CRM domain-க்கு பொருந்துகிறதா பார்க்கவும்.
6. Website-ன் portal links `build.py`-ல் `PORTAL_DOMAIN` மூலம் உருவாகின்றன. வேறு CRM hostname பயன்படுத்தினால் அதை மாற்றி `python build.py` → commit → redeploy செய்யவும். [Vercel project settings](https://vercel.com/docs/project-configuration/project-settings)

## 10. Local-ல் இரண்டையும் இயக்குவது

Root `.env.local` மற்றும் `portal/.env.local`-ல் public Supabase values சேர்க்கவும். Existing `.env` values இருந்தால் அவை பயன்படுத்தப்படும்; புதிய `.env.local` override வேண்டுமானால் server restart செய்யவும்.

Terminal 1 — website + API:

```powershell
cd D:\mucolabs.github.io
node scripts/dev-site.mjs
```

Open `http://localhost:8123/work`.

Terminal 2 — CRM:

```powershell
cd D:\mucolabs.github.io\portal
npm run dev
```

Open `http://localhost:3000/login`. `localhost` / `127.0.0.1` hostname-ஐ login நடுவில் மாற்றாமல் ஒரே hostname பயன்படுத்தவும். Public website-ன் existing portal links production domain-ஐத் திறக்கும்; local testing-க்கு CRM URL-ஐ நேரடியாகத் திறக்கவும்.

Read-only connection check:

```powershell
cd D:\mucolabs.github.io\portal
npm run check:setup
```

Port already in use என்றால் அந்த server-ஐ நிறுத்தி மீண்டும் தொடங்கவும். Temporary website port மாற்ற `node scripts/dev-site.mjs 8124` பயன்படுத்தலாம். `serve.py` static files மட்டும் serve செய்கிறது; API testing-க்கு Node server பயன்படுத்தவும்.

## 11. Launch முன் இந்த actual flows-ஐ முடிக்கவும்

1. **Admin:** sign in → customer create → lead create → stage/value edit → refresh browser. Saved data இருக்க வேண்டும்.
2. **Realtime:** same staff account-ஐ இரண்டு tabs-ல் திறக்கவும். Tab A-ல் lead edit; Tab B-ல் சில நொடிகளில் change வர வேண்டும். Websocket இல்லாவிட்டாலும் 30 seconds அல்லது focus refresh-ல் புதுப்பிக்க வேண்டும்.
3. **Automation:** admin `/automation`-ல் rule enable → புதிய lead create → `/tasks`-ல் ஒரே ஒரு next-day follow-up உருவாக வேண்டும். Rule disable செய்தபின் புதிய lead-க்கு அந்த task உருவாகக் கூடாது.
4. **Website:** test enquiry submit → `/enquiries`-ல் பார்க்கவும் → status edit. New submission analytics `/analytics`-ல் வருகிறதா பார்க்கவும். DNT/GPC enabled browser-ல் analytics collect ஆகாதது intended behavior.
5. **Customer:** தனி email-ல் `/signup` → verify email → complete profile → new request. Staff `/requests` inbox-ல் அது வர வேண்டும்.
6. **Customer isolation:** வேறு customer account-ஐ incognito/profile-ல் பயன்படுத்தவும். அவருக்கு முதல் customer-ன் project, invoice அல்லது files தெரியக் கூடாது. Staff `/leads` direct URL customer account-ல் திறந்தால் `/portal`-க்கு செல்ல வேண்டும். UI redirect மட்டும் போதாது; Supabase query-க்கும் RLS இருக்க வேண்டும்.
7. **Files:** admin ஒரு சிறிய PDF upload செய்து customer-க்கு assign → அந்த customer account-ல் download → வேறு customer-க்கு தெரியாதது உறுதி. Staff-only upload எந்த customer-க்கும் தெரியக் கூடாது.
8. **Invitation:** Settings-ல் staff email-க்கு invitation link create → அந்த email-ன் account-ல் accept. “Invitation created” என்பது link உருவாக்கியது; email அனுப்பப்பட்டது என்று பொருள் இல்லை.
9. **Password reset:** customer மற்றும் staff இரண்டிற்கும் forgot password → email link → reset page → புதிய password-ல் sign in.
10. **Database checks:** staging project SQL Editor-ல் `portal/supabase/tests/access_checks.sql` ஓட்டவும். Comment-ல் கொடுக்கப்பட்ட customer UUID tests-ஐ உண்மையான staging accounts மூலம் முடிக்கவும். RLS error வர வேண்டிய write succeeds என்றால் launch செய்ய வேண்டாம். [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)

## 12. பொதுவான errors

| அறிகுறி | காரணம் / தீர்வு |
|---|---|
| `relation ... does not exist`, HTTP 404, RPC not found | Missing migration அல்லது schema cache. Missing migrations apply; தேவைப்பட்டால் `notify pgrst, 'reload schema';` |
| Sign in முடிந்ததும் complete-profile | Staff membership இல்லை; admin bootstrap மற்றும் சரியான organization பார்க்கவும் |
| Workspace unavailable | Live migration version check, database connectivity, membership query logs பார்க்கவும் |
| `permission denied`, RLS violation | Login role, organization membership, latest policies பார்க்கவும்; RLS disable செய்ய வேண்டாம் |
| Record save error on invoice | Customer selection, unique invoice number, required amount பார்க்கவும் |
| Record வந்தும் live update இல்லை | Realtime publication, logged-in session, browser websocket connection பார்க்கவும் |
| Signup/recovery email வரவில்லை | SMTP provider verification, Auth logs, spam folder, rate limits, redirect URL பார்க்கவும் |
| Invalid callback | Expired/reused link அல்லது வேறு browser PKCE verifier; அதே browser-ல் புதிய link கோரவும் |
| File upload denied | Live migration, private bucket, staff role, accepted file type, 10 MB limit பார்க்கவும் |
| Website API 501 locally | Python static server ஓடுகிறது; Node `scripts/dev-site.mjs` பயன்படுத்தவும் |
| Website API works but enquiry CRM-ல் இல்லை | இரண்டு apps-ன் Supabase project match, `muco-labs` organization, ingestion migrations, function logs பார்க்கவும் |
| Website sign-in button wrong host | `build.py` → `PORTAL_DOMAIN` மாற்றி regenerate/redeploy |

## 13. தற்போதைய product எல்லைகள்

- Proposal / invoice pages records மற்றும் statuses track செய்கின்றன. GST-compliant document generation, payment gateway, automatic email delivery சேர்க்கப்படவில்லை.
- Customer request attachment input இப்போது filename/size metadata மட்டும் சேமிக்கிறது. Actual deliverables-ஐ staff Files பகுதியில் upload/share செய்ய வேண்டும்.
- Staff record lists 25 per page. Customer dashboard latest 100 records per category காட்டுகிறது; customer selection dropdown latest up to 1000 names ஏற்றுகிறது.
- பல organizations-க்கு ஒரே user சேர்ந்தால் current app ஒரு workspace-ஐத் தேர்வு செய்கிறது; explicit workspace switcher இல்லை. இந்த installation ஒரு MUCO workspace-ஐ நோக்கமாகக் கொண்டது.
- Anonymous lead/event endpoints-ன் process-local rate limits ஆரம்ப பாதுகாப்பு மட்டுமே. Traffic அதிகரித்தால் shared rate limiting, monitoring, backup/restore drills, abuse protection ஆகியவற்றைச் சேர்க்கவும்.
- Analytics retention helper இருப்பது scheduled cleanup இயங்குகிறது என்பதல்ல. Database-ல் பயன்படுத்தும் cleanup function மற்றும் scheduler-ஐத் தனியாக verify செய்யவும்.

## 14. இந்த மாற்றத்தின் verification பதிவு

Local checks: website API test cases, authentication callback regressions, CRM payload regressions, ESLint, TypeScript production build. Browser-ல் desktop/mobile image loading, form create/edit, failed-save recovery, incoming update மற்றும் search சோதிக்கப்பட்டது. CRM browser test-ல் database boundary mocked; இது real Supabase RLS / SMTP / Storage / publication end-to-end test-க்கு மாற்று அல்ல. `check:setup` மட்டும் connected Supabase-க்கு read-only request அனுப்பியது.

Guide-ல் உள்ள setup directions official Supabase / Vercel documentation-ஐச் சரிபார்த்து, இந்த repository-ன் actual schema மற்றும் configuration-க்கு ஏற்ப எழுதப்பட்டவை. UI menu names மாறியிருந்தால் இணைக்கப்பட்ட official page-ஐப் பயன்படுத்தவும்.
