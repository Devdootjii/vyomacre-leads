# VyomAcre — Leads

Lead capture for VyomAcre: a public form, an admin panel, and a serverless API.
One Vercel project, one Postgres table.

**Live:** https://vyomacre-leads.vercel.app · **Admin:** `/admin`

---

## What it does

Someone fills the form (from a reel, an Instagram bio, or a WhatsApp reply).
The moment it is submitted, the lead is classified — nobody has to sort a
spreadsheet later.

| Field | How it is decided |
|---|---|
| `asset_type` | Asked first: `rooftop` / `farmland` / `building` / `other`. Changes the rest of the form. |
| `city_zone` | `lucknow` if the city is Lucknow, otherwise `outside` |
| `lead_type` | `owner` (rent it out) / `developer` (needs one) / `both` |
| `priority` | `A` call today · `B` call this week · `C` waitlist |

**The priority rules, in plain words**

- **A** — Lucknow, owns the building, 3,000 sq ft or more, available now. Call today.
- **B** — Lucknow, owns it, smaller roof; or a big rented roof; or a developer ready to move.
- **C** — outside Lucknow, or a small roof, or "later", or **anything that is not a rooftop**.

Farmland and buildings are collected as demand signal only. They go to the
waitlist until we can actually serve them — but the admin panel shows the
rooftop / farmland / building split, so the next vertical is chosen from data
rather than a guess.

Developers are always A or B: they are the paying side and they travel to a
good site. Owners cannot move their roof, so an owner we cannot visit is a
number, not a lead.

---

## The three screens

**`/` — the form.** Mobile-first, dark, same design language as the main
VyomAcre site. Asks what you have first, then only the questions that make
sense for it. Rooftops get roof type, best use and availability; farmland gets
acreage; buildings get a size band.

**`/admin` — the leads board.** Enter the admin key once (kept in
sessionStorage for the tab). Shows totals, the priority split and the asset
split; filters by priority, asset type, city and status; a WhatsApp button per
lead that opens a pre-filled chat; status buttons; and a CSV export.

**After submit** — a thank-you screen with a reference id and a single green
button that opens WhatsApp to `+91 93350 34238` with the reference already in
the message. "Register another property" is a quiet link underneath, not the
main action.

---

## API

```
POST   /api/leads    public   create a lead
GET    /api/leads    admin    list, with ?priority= &zone= &status=
PATCH  /api/leads    admin    { id, status }  status: new|contacted|qualified|dead
```

Admin routes need the header `x-admin-key`.

`POST` returns:

- `201 { ok, id, priority, city_zone, asset_type }` — created
- `409 duplicate_phone` — this number is already registered
- `422 validation_failed` with a `errors` map — field by field
- `429 too_many_requests` — more than 6 submissions from one IP in an hour
- `500 server_error` — usually `DATABASE_URL` missing or the table not created

A hidden honeypot field (`website`) quietly swallows bots.

---

## Setup

### 1. Database

Fresh database — Neon → SQL Editor → paste `db/schema.sql` → Run.

Database created before asset types existed — run `db/migrate-001-asset-type.sql`
instead. **Without that column every submission returns 500.**

```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS asset_type text NOT NULL DEFAULT 'rooftop';
CREATE INDEX IF NOT EXISTS leads_asset_idx ON leads (asset_type, created_at DESC);
```

### 2. Environment variables (Vercel → Settings → Environment Variables)

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon connection string, `postgresql://…?sslmode=require` |
| `ADMIN_KEY` | a long random string — this is the only thing protecting the leads list |

Generate a key:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Changing `ADMIN_KEY` needs a **redeploy** before the function picks it up.

### 3. Deploy

Vercel → Add New → Project → import this repo → framework preset **Vite** →
add the two variables → Deploy.

---

## Local development

```bash
npm install
npm test          # 9 tests over the classification logic
npm run dev       # UI on http://localhost:5174
```

`npm run dev` does not serve `/api`, so the form will say "could not submit".
For the full stack install the Vercel CLI and run `vercel dev`.

---

## Daily use

1. Morning: open `/admin`, filter **Priority A**, message those people on WhatsApp.
2. Mark each lead `contacted` → `qualified` → `dead` as you go.
3. Once a week: count what came in, and how much of it was farmland or buildings.
4. Export CSV whenever the data needs to live in Sheets.

---

## Notes

- One row per phone number — a second submission returns `409` and the person is
  told they are already registered.
- The consent checkbox is required. The phone number is personal data under the
  DPDP Act, so the form states what it is used for and that it is never sold.
- The form link belongs in three places: the reel description, the Instagram
  bio, and the WhatsApp Business greeting message.
- Any Postgres works — only `DATABASE_URL` changes.
