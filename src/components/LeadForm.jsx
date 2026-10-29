import { useMemo, useRef, useState } from 'react';
import { AREA_OPTIONS, AREA_LABELS } from '../../lib/categorise.js';

const ASSETS = [
  ['rooftop', 'Rooftop'],
  ['farmland', 'Farmland'],
  ['building', 'Building / plot'],
  ['other', 'Something else'],
];

const CITIES = [
  ['Lucknow', 'Lucknow'],
  ['Other UP', 'Other UP'],
  ['Delhi NCR', 'Delhi NCR'],
  ['Mumbai', 'Mumbai'],
  ['Other', 'Other city'],
];

const INTENTS = [
  ['rent_out', 'Rent it out'],
  ['need_roof', 'I need one'],
  ['both', 'Both'],
];

const OWNERSHIP = [
  ['mine', 'Mine'],
  ['family', 'Family owned'],
  ['rented', 'Rented'],
  ['company', 'Company owned'],
];

const ROOFS = [
  ['rcc', 'RCC / concrete'],
  ['tin', 'Tin shed'],
  ['asbestos', 'Asbestos'],
  ['other', 'Other'],
];

const USE_CASES = [
  ['solar', 'Solar'],
  ['tower', 'Telecom tower'],
  ['hoarding', 'Hoarding'],
  ['storage', 'Storage'],
  ['unsure', 'Not sure'],
];

const AVAILABILITY = [
  ['now', 'Right now'],
  ['1_3_months', 'In 1–3 months'],
  ['later', 'Later'],
];

const WA_NUMBER = '919335034238'; // business WhatsApp
const WA_TEXT = 'Namaste VyomAcre! Maine website par form bhara hai.';

const EMPTY = {
  asset_type: '',
  name: '',
  phone: '',
  city: '',
  intent: '',
  owns_building: '',
  area_bucket: '',
  roof_type: '',
  locality: '',
  use_cases: [],
  available: '',
  consent: false,
  website: '', // honeypot
};

function Pills({ options, value, onChange, multi = false }) {
  const isOn = (v) => (multi ? value.includes(v) : value === v);
  const toggle = (v) => {
    if (!multi) return onChange(v);
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  return (
    <div className="pills">
      {options.map(([v, label]) => (
        <button
          type="button"
          key={v}
          className={`pill${isOn(v) ? ' on' : ''}`}
          onClick={() => toggle(v)}
          aria-pressed={isOn(v)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function LeadForm() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [state, setState] = useState('idle'); // idle | sending | done
  const [banner, setBanner] = useState('');
  const [refId, setRefId] = useState('');
  const formRef = useRef(null);

  const set = (k) => (v) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      // switching what you have resets the size, since the options differ
      if (k === 'asset_type' && v !== f.asset_type) next.area_bucket = '';
      return next;
    });
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const isRoof = form.asset_type === 'rooftop';
  const areaOptions = useMemo(
    () => (AREA_OPTIONS[form.asset_type] || []).map((v) => [v, AREA_LABELS[v]]),
    [form.asset_type]
  );

  const phoneOk = useMemo(
    () => /^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, '').slice(-10)),
    [form.phone]
  );

  function validate() {
    const e = {};
    if (!form.asset_type) e.asset_type = 'Please pick one.';
    if (form.name.trim().length < 2) e.name = 'Please enter your name.';
    if (!phoneOk) e.phone = 'Enter a valid 10-digit mobile number.';
    if (!form.city) e.city = 'Please choose your city.';
    if (!form.owns_building) e.owns_building = 'Please pick one.';
    if (!form.area_bucket) e.area_bucket = 'Please choose the size.';
    if (isRoof && !form.roof_type) e.roof_type = 'Please choose the roof type.';
    if (!form.intent) e.intent = 'Please pick one.';
    if (isRoof && !form.available) e.available = 'Please pick one.';
    if (!form.consent) e.consent = 'Please tick the box so we can contact you.';
    return e;
  }

  async function submit(ev) {
    ev.preventDefault();
    setBanner('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      const first = formRef.current?.querySelector('.invalid, .err');
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setState('sending');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'reel' }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 201 && data.ok) {
        setRefId(String(data.id || '').slice(0, 8).toUpperCase());
        setState('done');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (res.status === 409) {
        setState('idle');
        setBanner('This number is already registered with us. Our team will contact you — no need to submit again.');
        return;
      }
      if (res.status === 429) {
        setState('idle');
        setBanner('Too many submissions from this connection. Please try again after an hour.');
        return;
      }
      if (res.status === 422 && data.errors) {
        setState('idle');
        setErrors(data.errors);
        setBanner('Please check the highlighted fields.');
        return;
      }
      throw new Error(data.error || `HTTP ${res.status}`);
    } catch (err) {
      setState('idle');
      setBanner('Could not submit right now. Please try again in a minute, or message us on WhatsApp.');
      console.error('[lead submit]', err);
    }
  }

  if (state === 'done') {
    const waHref = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
      `${WA_TEXT} Reference: ${refId || '-'}`
    )}`;
    return (
      <div className="card">
        <div className="done">
          <div className="tick">✓</div>
          <h2>Thank you — we have it.</h2>
          <p>
            Your details are saved. Our team will message you on WhatsApp within 24 hours to
            understand what you have and explain the next step.
          </p>
          {refId && <div className="ref">REFERENCE {refId}</div>}

          <a
            className="submit"
            style={{ display: 'block', textDecoration: 'none', marginTop: 26 }}
            href={waHref}
            target="_blank"
            rel="noreferrer"
          >
            Message us on WhatsApp
          </a>

          <p className="formnote" style={{ marginTop: 10 }}>
            +91 93350 34238 · usually replies the same day
          </p>

          <button
            className="linkish"
            onClick={() => {
              setForm(EMPTY);
              setErrors({});
              setRefId('');
              setState('idle');
            }}
          >
            Register another property
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="brand">
        <span className="mark"><i /></span>
        <span className="brand-name">Vyom<span>Acre</span></span>
      </div>

      <h1>List your rooftop</h1>
      <p className="lede">
        Solar companies, telecom towers and brands are looking for roof space in Lucknow.
        Tell us what you have and we will check it.
      </p>
      <span className="promise">No advance · No commission · No hidden charges</span>

      <form ref={formRef} onSubmit={submit} noValidate>
        {/* honeypot — hidden from humans */}
        <div className="hp" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => set('website')(e.target.value)}
          />
        </div>

        <div className="group" style={{ marginTop: 24 }}>
          <div className="group-title">What do you have?</div>
          <div className="field">
            <Pills options={ASSETS} value={form.asset_type} onChange={set('asset_type')} />
            {errors.asset_type && <span className="err">{errors.asset_type}</span>}
            {!isRoof && form.asset_type && (
              <p className="formnote" style={{ textAlign: 'left', marginTop: 10 }}>
                We are starting with rooftops in Lucknow. Land and buildings are being collected
                for our next phase — you will hear from us when we reach your city or category.
              </p>
            )}
          </div>
        </div>

        <div className="group">
          <div className="group-title">About you</div>

          <div className="field">
            <label className="label" htmlFor="name">Your name</label>
            <input
              id="name"
              type="text"
              className={errors.name ? 'invalid' : ''}
              placeholder="Full name"
              value={form.name}
              onChange={(e) => set('name')(e.target.value)}
              autoComplete="name"
            />
            {errors.name && <span className="err">{errors.name}</span>}
          </div>

          <div className="field">
            <label className="label" htmlFor="phone">WhatsApp number</label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              className={errors.phone ? 'invalid' : ''}
              placeholder="10-digit mobile number"
              value={form.phone}
              onChange={(e) => set('phone')(e.target.value.replace(/[^\d+\s-]/g, '').slice(0, 15))}
              autoComplete="tel"
            />
            {errors.phone && <span className="err">{errors.phone}</span>}
          </div>

          <div className="field">
            <span className="label">City</span>
            <Pills options={CITIES} value={form.city} onChange={set('city')} />
            {errors.city && <span className="err">{errors.city}</span>}
          </div>
        </div>

        {form.asset_type && (
        <div className="group">
          <div className="group-title">About the {isRoof ? 'roof' : 'property'}</div>

          <div className="field">
            <span className="label">Who owns it?</span>
            <Pills options={OWNERSHIP} value={form.owns_building} onChange={set('owns_building')} />
            {errors.owns_building && <span className="err">{errors.owns_building}</span>}
          </div>

          <div className="field">
            <span className="label">
              {form.asset_type === 'farmland' ? 'How much land?' : 'Size'}
            </span>
            {areaOptions.length > 0 ? (
              <Pills options={areaOptions} value={form.area_bucket} onChange={set('area_bucket')} />
            ) : (
              <p className="formnote" style={{ textAlign: 'left' }}>Choose above first.</p>
            )}
            {errors.area_bucket && <span className="err">{errors.area_bucket}</span>}
          </div>

          {isRoof && (
            <div className="field">
              <span className="label">Roof type</span>
              <Pills options={ROOFS} value={form.roof_type} onChange={set('roof_type')} />
              {errors.roof_type && <span className="err">{errors.roof_type}</span>}
            </div>
          )}

          <div className="field">
            <label className="label" htmlFor="locality">Locality or address (optional)</label>
            <input
              id="locality"
              type="text"
              placeholder="e.g. Gomti Nagar, near Sahara Ganj"
              value={form.locality}
              onChange={(e) => set('locality')(e.target.value)}
            />
          </div>
        </div>
        )}

        {form.asset_type && (
        <div className="group">
          <div className="group-title">What you want</div>

          <div className="field">
            <span className="label">I want to</span>
            <Pills options={INTENTS} value={form.intent} onChange={set('intent')} />
            {errors.intent && <span className="err">{errors.intent}</span>}
          </div>

          {isRoof && (
            <>
              <div className="field">
                <span className="label">Best use (optional, pick any)</span>
                <Pills options={USE_CASES} value={form.use_cases} onChange={set('use_cases')} multi />
              </div>

              <div className="field">
                <span className="label">Available from</span>
                <Pills options={AVAILABILITY} value={form.available} onChange={set('available')} />
                {errors.available && <span className="err">{errors.available}</span>}
              </div>
            </>
          )}
        </div>
        )}

        <label className="consent">
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(e) => set('consent')(e.target.checked)}
          />
          <span>
            I agree to be contacted on WhatsApp about this. We use these details only for this
            purpose and never sell them.
          </span>
        </label>
        {errors.consent && <span className="err">{errors.consent}</span>}

        {banner && <div className="banner">{banner}</div>}

        <button className="submit" type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending…' : 'Submit'}
        </button>

        <p className="formnote">Takes about a minute. We reply on WhatsApp, usually the same day.</p>
      </form>
    </div>
  );
}
