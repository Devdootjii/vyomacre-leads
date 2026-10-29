/**
 * lib/categorise.js
 * Pure functions — no imports, no side effects. Used by the API (to sort a
 * lead the moment it arrives) and by the tests.
 */

export const ASSET_TYPES = ['rooftop', 'farmland', 'building', 'other'];

export const CITIES = ['Lucknow', 'Other UP', 'Delhi NCR', 'Mumbai', 'Other'];
export const INTENTS = ['rent_out', 'need_roof', 'both'];
export const OWNERSHIP = ['mine', 'rented', 'family', 'company'];
export const ROOF_TYPES = ['rcc', 'tin', 'asbestos', 'other'];
export const AVAILABILITY = ['now', '1_3_months', 'later'];
export const USE_CASES = ['solar', 'tower', 'hoarding', 'storage', 'unsure'];

/** Size options depend on what is being listed. */
export const AREA_OPTIONS = {
  rooftop: ['under_1000', '1000_3000', '3000_10000', '10000_plus'],
  building: ['under_5000', '5000_20000', '20000_plus'],
  farmland: ['under_1_acre', '1_5_acre', '5_plus_acre'],
  other: ['unsure'],
};

export const AREA_LABELS = {
  under_1000: 'Under 1,000 sq ft',
  '1000_3000': '1,000 – 3,000 sq ft',
  '3000_10000': '3,000 – 10,000 sq ft',
  '10000_plus': '10,000+ sq ft',
  under_5000: 'Under 5,000 sq ft',
  '5000_20000': '5,000 – 20,000 sq ft',
  '20000_plus': '20,000+ sq ft',
  under_1_acre: 'Under 1 acre',
  '1_5_acre': '1 – 5 acres',
  '5_plus_acre': '5+ acres',
  unsure: 'Not sure',
};

const AREA_RANK = { under_1000: 0, '1000_3000': 1, '3000_10000': 2, '10000_plus': 3 };

/** Accepts "+91 93350 34238", "09335034238", "9335034238" → "9335034238" */
export function normalisePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) return digits;
  if (digits.length === 12 && digits.startsWith('91')) {
    const tail = digits.slice(2);
    return /^[6-9]/.test(tail) ? tail : null;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    const tail = digits.slice(1);
    return /^[6-9]/.test(tail) ? tail : null;
  }
  return null;
}

export function cityZone(city) {
  return city === 'Lucknow' ? 'lucknow' : 'outside';
}

export function leadType(intent) {
  if (intent === 'need_roof') return 'developer';
  if (intent === 'both') return 'both';
  return 'owner';
}

/**
 * A = call today, B = call this week, C = waitlist, do not chase.
 *
 * Two rules drive everything:
 *   1. supply is local (you must visit the roof), demand is national
 *      (a developer will travel to a good site);
 *   2. right now we can only serve rooftops in Lucknow — farmland and
 *      buildings are collected for the signal, not for follow-up.
 */
export function computePriority(d) {
  const type = leadType(d.intent);

  // The paying side. Worth a call wherever they are.
  if (type === 'developer') return d.available === 'now' ? 'A' : 'B';

  // Anything that is not a rooftop is a waitlist entry for now.
  if (d.asset_type && d.asset_type !== 'rooftop') return 'C';

  // An owner we cannot visit yet is a number, not a lead.
  if (cityZone(d.city) !== 'lucknow') return 'C';

  const area = AREA_RANK[d.area_bucket] ?? 0;
  const owns = d.owns_building === 'mine';

  if (owns && area >= 2 && d.available === 'now') return 'A';
  if (owns && area >= 1) return 'B';
  if (owns && area === 0) return 'C';
  if (area >= 2) return 'B'; // rented, but big enough for a developer to care
  return 'C';
}

/** Returns { ok, errors: {field: message}, clean: {...} } */
export function validateLead(body = {}) {
  const errors = {};

  const name = String(body.name || '').trim();
  if (name.length < 2) errors.name = 'Please enter your name.';
  if (name.length > 120) errors.name = 'Name is too long.';

  const phone = normalisePhone(body.phone);
  if (!phone) errors.phone = 'Enter a valid 10-digit Indian mobile number.';

  const city = CITIES.includes(body.city) ? body.city : null;
  if (!city) errors.city = 'Please choose your city.';

  const assetType = ASSET_TYPES.includes(body.asset_type) ? body.asset_type : null;
  if (!assetType) errors.asset_type = 'Please choose what you have.';

  const intent = INTENTS.includes(body.intent) ? body.intent : null;
  if (!intent) errors.intent = 'Please tell us what you want to do.';

  const owns = OWNERSHIP.includes(body.owns_building) ? body.owns_building : null;
  if (!owns) errors.owns_building = 'Please tell us who owns it.';

  const allowedAreas = assetType ? AREA_OPTIONS[assetType] : [];
  const area = allowedAreas.includes(body.area_bucket) ? body.area_bucket : null;
  if (!area) errors.area_bucket = 'Please choose the size.';

  // Roof-specific questions are only asked (and only required) for rooftops.
  const isRoof = assetType === 'rooftop';

  let roof = '';
  if (isRoof) {
    roof = ROOF_TYPES.includes(body.roof_type) ? body.roof_type : null;
    if (!roof) errors.roof_type = 'Please choose the roof type.';
  }

  let available = 'unknown';
  if (isRoof) {
    available = AVAILABILITY.includes(body.available) ? body.available : null;
    if (!available) errors.available = 'Please tell us when it is available.';
  }

  const locality = String(body.locality || '').trim().slice(0, 200);

  const useCases = Array.isArray(body.use_cases)
    ? body.use_cases.filter((u) => USE_CASES.includes(u))
    : [];

  if (body.consent !== true) errors.consent = 'Please agree to be contacted on WhatsApp.';

  const ok = Object.keys(errors).length === 0;

  return {
    ok,
    errors,
    clean: ok
      ? {
          name,
          phone,
          city,
          city_zone: cityZone(city),
          asset_type: assetType,
          lead_type: leadType(intent),
          intent,
          owns_building: owns,
          area_bucket: area,
          roof_type: roof || '',
          locality,
          use_cases: useCases.join(','),
          available,
          priority: computePriority({
            city,
            intent,
            asset_type: assetType,
            owns_building: owns,
            area_bucket: area,
            available,
          }),
          source: ['reel', 'whatsapp', 'direct'].includes(body.source) ? body.source : 'direct',
        }
      : null,
  };
}
