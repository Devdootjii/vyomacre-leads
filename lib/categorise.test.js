import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalisePhone, cityZone, leadType, computePriority, validateLead } from './categorise.js';

const roofBase = {
  name: 'Ramesh Yadav',
  phone: '+91 93350 34238',
  city: 'Lucknow',
  asset_type: 'rooftop',
  intent: 'rent_out',
  owns_building: 'mine',
  area_bucket: '3000_10000',
  roof_type: 'rcc',
  locality: 'Gomti Nagar',
  use_cases: ['solar', 'tower', 'garbage'],
  available: 'now',
  consent: true,
  source: 'reel',
};

test('phone normalisation', () => {
  assert.equal(normalisePhone('9335034238'), '9335034238');
  assert.equal(normalisePhone('+91 93350 34238'), '9335034238');
  assert.equal(normalisePhone('09335034238'), '9335034238');
  assert.equal(normalisePhone('12345'), null);
  assert.equal(normalisePhone('5335034238'), null);
  assert.equal(normalisePhone(''), null);
});

test('city zone', () => {
  assert.equal(cityZone('Lucknow'), 'lucknow');
  assert.equal(cityZone('Mumbai'), 'outside');
});

test('lead type', () => {
  assert.equal(leadType('rent_out'), 'owner');
  assert.equal(leadType('need_roof'), 'developer');
  assert.equal(leadType('both'), 'both');
});

test('priority — the cases that matter', () => {
  assert.equal(computePriority({ city: 'Lucknow', intent: 'rent_out', owns_building: 'mine', area_bucket: '3000_10000', available: 'now' }), 'A');
  assert.equal(computePriority({ city: 'Lucknow', intent: 'rent_out', owns_building: 'mine', area_bucket: '1000_3000', available: 'now' }), 'B');
  assert.equal(computePriority({ city: 'Mumbai', intent: 'rent_out', owns_building: 'mine', area_bucket: '10000_plus', available: 'now' }), 'C');
  assert.equal(computePriority({ city: 'Mumbai', intent: 'need_roof', owns_building: 'company', area_bucket: 'under_1000', available: 'now' }), 'A');
});

test('farmland and buildings go to the waitlist even in Lucknow', () => {
  assert.equal(computePriority({ city: 'Lucknow', asset_type: 'farmland', intent: 'rent_out', owns_building: 'mine', area_bucket: '5_plus_acre', available: 'now' }), 'C');
  assert.equal(computePriority({ city: 'Lucknow', asset_type: 'building', intent: 'rent_out', owns_building: 'mine', area_bucket: '20000_plus', available: 'now' }), 'C');
  // but a developer asking for land is still the paying side
  assert.equal(computePriority({ city: 'Lucknow', asset_type: 'farmland', intent: 'need_roof', owns_building: 'company', area_bucket: '5_plus_acre', available: 'now' }), 'A');
});

test('validation rejects an incomplete submission', () => {
  const r = validateLead({ name: 'A' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.name && r.errors.phone && r.errors.city && r.errors.consent && r.errors.asset_type);
});

test('a complete rooftop submission is accepted and classified', () => {
  const r = validateLead(roofBase);
  assert.equal(r.ok, true);
  assert.equal(r.clean.phone, '9335034238');
  assert.equal(r.clean.city_zone, 'lucknow');
  assert.equal(r.clean.asset_type, 'rooftop');
  assert.equal(r.clean.lead_type, 'owner');
  assert.equal(r.clean.priority, 'A');
  assert.equal(r.clean.use_cases, 'solar,tower'); // unknown value dropped
});

test('farmland does not need roof type or availability', () => {
  const r = validateLead({
    name: 'Sunil Verma',
    phone: '9876543210',
    city: 'Lucknow',
    asset_type: 'farmland',
    intent: 'rent_out',
    owns_building: 'mine',
    area_bucket: '5_plus_acre',
    consent: true,
  });
  assert.equal(r.ok, true);
  assert.equal(r.clean.roof_type, '');
  assert.equal(r.clean.available, 'unknown');
  assert.equal(r.clean.priority, 'C');
});

test('a rooftop area bucket is rejected for farmland', () => {
  const r = validateLead({ ...roofBase, asset_type: 'farmland', area_bucket: '3000_10000' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.area_bucket);
});
