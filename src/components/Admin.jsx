import { useCallback, useEffect, useState } from 'react';

const STATUSES = ['new', 'contacted', 'qualified', 'dead'];

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
  const [filters, setFilters] = useState({ priority: '', zone: '', status: '' });

  const load = useCallback(
    async (adminKey = key) => {
      if (!adminKey) return;
      setLoading(true);
      setError('');
      try {
        const qs = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
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
      'created_at', 'name', 'phone', 'city', 'city_zone', 'priority', 'status',
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

  const counts = leads.reduce(
    (acc, l) => {
      acc[l.priority] = (acc[l.priority] || 0) + 1;
      return acc;
    },
    {}
  );

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
        <div className="stat"><b>{counts.A || 0}</b><span>Priority A</span></div>
        <div className="stat"><b>{counts.B || 0}</b><span>Priority B</span></div>
        <div className="stat"><b>{counts.C || 0}</b><span>Waitlist</span></div>
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

      {leads.map((l) => (
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
            <span className="tag">{l.lead_type}</span>
            <span className="tag">{l.area_bucket}</span>
            <span className="tag">{l.roof_type}</span>
            <span className="tag">owns: {l.owns_building}</span>
            <span className="tag">{l.available}</span>
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
