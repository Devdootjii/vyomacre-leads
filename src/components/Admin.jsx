import { useCallback, useEffect, useMemo, useState } from 'react';
import { AREA_LABELS } from '../../lib/categorise.js';

const STATUSES = ['new', 'contacted', 'qualified', 'dead'];
const ASSET_LABELS = {
  rooftop: 'Rooftop',
  farmland: 'Farmland',
  building: 'Building',
  other: 'Other',
};

function waLink(phone) {
  return `https://wa.me/91${phone}?text=${encodeURIComponent(
    'Namaste! VyomAcre se baat kar rahe hain — aapki chhat ke baare me.'
  )}`;
}

function csvEscape(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function Admin() {
  const [key, setKey] = useState(() => sessionStorage.getItem('vyom_admin_key') || '');
  const [input, setInput] = useState('');
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ priority: '', zone: '', status: '', asset: '' });

  const load = useCallback(
    async (adminKey = key) => {
      if (!adminKey) return;
      setLoading(true);
      setError('');
      try {
        const qs = new URLSearchParams();
        ['priority', 'zone', 'status'].forEach((k) => filters[k] && qs.set(k, filters[k]));
        const res = await fetch(`/api/leads?${qs}`, { headers: { 'x-admin-key': adminKey } });
        if (res.status === 401) {
          setError('Wrong admin key.');
          sessionStorage.removeItem('vyom_admin_key');
          setKey('');
          setLeads([]);
          return;
        }
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'failed');
        setLeads(data.leads || []);
        setTotal(data.total || 0);
      } catch (err) {
        setError('Could not load leads. Check the key and try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [filters, key]
  );

  useEffect(() => {
    if (key) load(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, filters]);

  async function setStatus(id, status) {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
    await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify({ id, status }),
    }).catch(() => {});
  }

  function exportCsv() {
    const cols = [
      'created_at', 'name', 'phone', 'city', 'city_zone', 'asset_type', 'priority', 'status',
      'lead_type', 'owns_building', 'area_bucket', 'roof_type', 'locality',
      'use_cases', 'available', 'source', 'notes',
    ];
    const rows = [cols.join(','), ...leads.map((l) => cols.map((c) => csvEscape(l[c])).join(','))];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vyomacre-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const stats = useMemo(() => {
    const s = { A: 0, B: 0, C: 0, rooftop: 0, farmland: 0, building: 0, other: 0 };
    leads.forEach((l) => {
      if (s[l.priority] !== undefined) s[l.priority] += 1;
      const a = l.asset_type || 'rooftop';
      if (s[a] !== undefined) s[a] += 1;
    });
    return s;
  }, [leads]);

  if (!key) {
    return (
      <div className="card">
        <h1>Admin</h1>
        <p className="lede">Enter the admin key to view leads.</p>
        <div className="field" style={{ marginTop: 20 }}>
          <input
            type="password"
            placeholder="Admin key"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && input) {
                sessionStorage.setItem('vyom_admin_key', input);
                setKey(input);
              }
            }}
          />
        </div>
        <button
          className="submit"
          onClick={() => {
            if (!input) return;
            sessionStorage.setItem('vyom_admin_key', input);
            setKey(input);
          }}
        >
          Open
        </button>
        {error && <div className="banner">{error}</div>}
      </div>
    );
  }

  return (
    <div>
      <div className="admin-head">
        <h1>Leads</h1>
        <div className="lead-actions" style={{ margin: 0 }}>
          <button className="mini" onClick={() => load()}>Refresh</button>
          <button className="mini" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      <div className="statrow">
        <div className="stat"><b>{total}</b><span>Total</span></div>
        <div className="stat"><b>{stats.A}</b><span>Priority A</span></div>
        <div className="stat"><b>{stats.B}</b><span>Priority B</span></div>
        <div className="stat"><b>{stats.C}</b><span>Waitlist</span></div>
      </div>

      <div className="statrow">
        <div className="stat"><b>{stats.rooftop}</b><span>Rooftop</span></div>
        <div className="stat"><b>{stats.farmland}</b><span>Farmland</span></div>
        <div className="stat"><b>{stats.building}</b><span>Building</span></div>
        <div className="stat"><b>{stats.other}</b><span>Other</span></div>
      </div>

      <div className="filters">
        {['', 'A', 'B', 'C'].map((p) => (
          <button
            key={`p${p}`}
            className={`pill${filters.priority === p ? ' on' : ''}`}
            onClick={() => setFilters((f) => ({ ...f, priority: p }))}
          >
            {p ? `Priority ${p}` : 'All priority'}
          </button>
        ))}
        {[['', 'All types'], ['rooftop', 'Rooftop'], ['farmland', 'Farmland'], ['building', 'Building'], ['other', 'Other']].map(
          ([a, label]) => (
            <button
              key={`a${a}`}
              className={`pill${filters.asset === a ? ' on' : ''}`}
              onClick={() => setFilters((f) => ({ ...f, asset: a }))}
            >
              {label}
            </button>
          )
        )}
        {[['', 'All cities'], ['lucknow', 'Lucknow'], ['outside', 'Outside']].map(([z, label]) => (
          <button
            key={`z${z}`}
            className={`pill${filters.zone === z ? ' on' : ''}`}
            onClick={() => setFilters((f) => ({ ...f, zone: z }))}
          >
            {label}
          </button>
        ))}
        {['', ...STATUSES].map((s) => (
          <button
            key={`s${s}`}
            className={`pill${filters.status === s ? ' on' : ''}`}
            onClick={() => setFilters((f) => ({ ...f, status: s }))}
          >
            {s || 'All status'}
          </button>
        ))}
      </div>

      {error && <div className="banner">{error}</div>}
      {loading && <p className="formnote">Loading…</p>}
      {!loading && !leads.length && <p className="formnote">No leads match these filters.</p>}

      {leads
        .filter((l) => !filters.asset || (l.asset_type || 'rooftop') === filters.asset)
        .map((l) => (
          <div className="lead" key={l.id}>
            <div className="lead-top">
              <div>
                <div className="lead-name">{l.name}</div>
                <div className="lead-meta">
                  {l.phone} · {l.city} · {new Date(l.created_at).toLocaleString('en-IN')}
                </div>
              </div>
              <span className={`badge ${l.priority}`}>{l.priority}</span>
            </div>

            <div className="lead-row">
              <span className="tag" style={{ color: '#00E585', borderColor: 'rgba(0,229,133,.35)' }}>
                {ASSET_LABELS[l.asset_type || 'rooftop'] || l.asset_type}
              </span>
              <span className="tag">{l.lead_type}</span>
              <span className="tag">{AREA_LABELS[l.area_bucket] || l.area_bucket}</span>
              {l.roof_type ? <span className="tag">{l.roof_type}</span> : null}
              <span className="tag">owns: {l.owns_building}</span>
              {l.available && l.available !== 'unknown' ? (
                <span className="tag">{l.available}</span>
              ) : null}
              {l.use_cases && <span className="tag">{l.use_cases}</span>}
              <span className="tag">status: {l.status}</span>
              <span className="tag">via {l.source}</span>
            </div>

            <div className="lead-actions">
              <a className="mini wa" href={waLink(l.phone)} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
              {STATUSES.filter((s) => s !== l.status).map((s) => (
                <button key={s} className="mini" onClick={() => setStatus(l.id, s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
