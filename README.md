# VyomAcre — Lead capture

Rooftop lead form + admin panel + serverless API. One Vercel project, one Neon table.

```
POST   /api/leads    public   the form submits here
GET    /api/leads    admin    list + filter (header: x-admin-key)
PATCH  /api/leads    admin    change status
```

---

## What it does on submit

Every lead is classified the moment it arrives, so nobody has to sort a spreadsheet:

| Field | Derived from |
|---|---|
| `city_zone` | `lucknow` if city is Lucknow, else `outside` |
| `lead_type` | `owner` / `developer` / `both` |
| `priority` | `A` call today · `B` this week · `C` waitlist |

**A** = Lucknow + own building + 3,000 sq ft or more + available now
**B** = Lucknow + own building + smaller roof, or a big rented roof
**C** = outside Lucknow, or small, or "later"

Developers (people who *need* a roof) are always A or B — they are the paying side and they travel.

---

## Setup (about 10 minutes)

### 1. Create the table

Open your Neon project → **SQL Editor** → paste `db/schema.sql` → Run.

Or from a terminal:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

### 2. Push this folder to GitHub

```bash
git init
git add .
git commit -m "VyomAcre lead capture"
git branch -M main
git remote add origin https://github.com/<your-username>/vyomacre-leads.git
git push -u origin main
```

### 3. Import to Vercel

1. vercel.com → **Add New → Project** → import the repo
2. Framework preset: **Vite** (auto-detected)
3. Before deploying, open **Environment Variables** and add:

| Name | Value |
|---|---|
| `DATABASE_URL` | your Neon connection string (`postgresql://...?sslmode=require`) |
| `ADMIN_KEY` | a long random string |

Generate a key with:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

4. Deploy.

### 4. Check it

- Form: `https://<project>.vercel.app/`
- Admin: `https://<project>.vercel.app/admin` (paste the `ADMIN_KEY`)

---

## Local development

```bash
npm install
npm test          # tests the classification logic
npm run dev       # UI on http://localhost:5174
```

`npm run dev` alone will not serve `/api` — the form will show "could not submit".
For a full local stack install the Vercel CLI and run `vercel dev`.

---

## Using it

- Put the form link in the reel description, Instagram bio, and the WhatsApp
  greeting message.
- Each morning: open `/admin`, filter **Priority A**, and WhatsApp those people.
- Mark each lead `contacted` → `qualified` → `dead` as you go.
- **Export CSV** whenever you want the data in Sheets.

---

## Notes

- One row per phone number. A second submission returns `409` and the form tells
  the person they are already registered.
- Honeypot field + 6 submissions per IP per hour.
- Consent checkbox is required — the number is personal data under the DPDP Act,
  so the form states what it is used for and that it is never sold.
- If you later move off Neon, any Postgres works; only `DATABASE_URL` changes.
