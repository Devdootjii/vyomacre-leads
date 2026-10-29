/**
 * api/leads.js — the whole backend.
 *
 *   POST   /api/leads            public   create a lead (used by the form)
 *   GET    /api/leads            admin    list leads, optional filters
 *   PATCH  /api/leads            admin    change a lead's status
 *
 * Environment variables required:
 *   DATABASE_URL   Neon Postgres connection string
 *   ADMIN_KEY      long random string, sent by /admin as x-admin-key
 */

import { neon } from '@neondatabase/serverless';
import { validateLead } from '../lib/categorise.js';

const MAX_PER_HOUR = 6;

function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  return neon(process.env.DATABASE_URL);
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || null;
}

function isAdmin(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  return req.headers['x-admin-key'] === key;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method === 'POST') return await createLead(req, res);
    if (req.method === 'GET') return await listLeads(req, res);
    if (req.method === 'PATCH') return await updateStatus(req, res);
    res.setHeader('Allow', 'GET, POST, PATCH, OPTIONS');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  } catch (err) {
    console.error('[leads] unhandled', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

async function createLead(req, res) {
  const body = typeof req.body === 'object' && req.body !== null ? req.body : {};

  // Honeypot: real users never see this field.
  if (body.website) return res.status(200).json({ ok: true, id: null });

  const { ok, errors, clean } = validateLead(body);
  if (!ok) return res.status(422).json({ ok: false, error: 'validation_failed', errors });

  const sql = db();
  const ip = clientIp(req);

  // Simple abuse guard: same IP, too many submissions in an hour.
  if (ip) {
    const [{ count }] = await sql`
      SELECT count(*)::int AS count FROM leads
      WHERE ip = ${ip} AND created_at > now() - interval '1 hour'
    `;
    if (count >= MAX_PER_HOUR) {
      return res.status(429).json({ ok: false, error: 'too_many_requests' });
    }
  }

  const rows = await sql`
    INSERT INTO leads
      (name, phone, city, city_zone, asset_type, lead_type, intent, owns_building,
       area_bucket, roof_type, locality, use_cases, available, priority, source, ip)
    VALUES
      (${clean.name}, ${clean.phone}, ${clean.city}, ${clean.city_zone}, ${clean.asset_type},
       ${clean.lead_type}, ${clean.intent}, ${clean.owns_building}, ${clean.area_bucket},
       ${clean.roof_type}, ${clean.locality}, ${clean.use_cases}, ${clean.available},
       ${clean.priority}, ${clean.source}, ${ip})
    ON CONFLICT (phone) DO NOTHING
    RETURNING id, priority, city_zone, asset_type
  `;

  if (!rows.length) {
    return res.status(409).json({ ok: false, error: 'duplicate_phone' });
  }

  return res.status(201).json({ ok: true, ...rows[0] });
}

async function listLeads(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const { priority = null, zone = null, status = null } = req.query || {};
  const sql = db();

  const rows = await sql`
    SELECT * FROM leads
    WHERE (${priority}::text IS NULL OR priority = ${priority}::text)
      AND (${zone}::text     IS NULL OR city_zone = ${zone}::text)
      AND (${status}::text   IS NULL OR status = ${status}::text)
    ORDER BY created_at DESC
    LIMIT 500
  `;

  const [{ total }] = await sql`SELECT count(*)::int AS total FROM leads`;
  return res.status(200).json({ ok: true, total, count: rows.length, leads: rows });
}

async function updateStatus(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const { id, status, notes } = req.body || {};
  const allowed = ['new', 'contacted', 'qualified', 'dead'];
  if (!id || !allowed.includes(status)) {
    return res.status(422).json({ ok: false, error: 'invalid_status' });
  }

  const sql = db();
  const rows = await sql`
    UPDATE leads
       SET status = ${status},
           notes = COALESCE(${notes ?? null}, notes)
     WHERE id = ${id}
    RETURNING id, status, notes
  `;
  if (!rows.length) return res.status(404).json({ ok: false, error: 'not_found' });
  return res.status(200).json({ ok: true, lead: rows[0] });
}
