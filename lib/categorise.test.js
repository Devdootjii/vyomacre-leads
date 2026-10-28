import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalisePhone, cityZone, leadType, computePriority, validateLead } from './categorise.js';

test('phone normalisation', () => {
  assert.equal(normalisePhone('9335034238'), '9335034238');
  assert.equal(normalisePhone('+91 93350 34238'), '9335034238');
  assert.equal(normalisePhone('09335034238'), '9335034238');
  assert.equal(normalisePhone('12345'), null);
  assert.equal(normalisePhone('5335034238'), null); // must start 6-9
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

test('priority — the four cases that matter', () => {
  // Big, owned, ready, in Lucknow → call today
  assert.equal(computePriority({ city: 'Lucknow', intent: 'rent_out', owns_building: 'mine', area_bucket: '3000_10000', available: 'now' }), 'A');
  // Owned but small → this week
  assert.equal(computePriority({ city: 'Lucknow', intent: 'rent_out', owns_building: 'mine', area_bucket: '1000_3000', available: 'now' }), 'B');
  // Outside Lucknow → waitlist, never chased
  assert.equal(computePriority({ city: 'Mumbai', intent: 'rent_out', owns_building: 'mine', area_bucket: '10000_plus', available: 'now' }), 'C');
  // Developer is the paying side → A
  assert.equal(computePriority({ city: 'Mumbai', intent: 'need_roof', owns_building: 'company', area_bucket: 'under_1000', available: 'now' }), 'A');
});

test('validation rejects an incomplete submission', () => {
  const r = validateLead({ name: 'A' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.name && r.errors.phone && r.errors.city && r.errors.consent);
});

test('validation accepts a complete submission and derives fields', () => {
  const r = validateLead({
    name: 'Ramesh Yadav',
    phone: '+91 93350 34238',
    city: 'Lucknow',
    intent: 'rent_out',
    owns_building: 'mine',
    area_bucket: '3000_10000',
    roof_type: 'rcc',
    locality: 'Gomti Nagar',
    use_cases: ['solar', 'tower', 'garbage'],
    available: 'now',
    consent: true,
    source: 'reel',
  });
  assert.equal(r.ok, true);
  assert.equal(r.clean.phone, '9335034238');
  assert.equal(r.clean.city_zone, 'lucknow');
  assert.equal(r.clean.lead_type, 'owner');
  assert.equal(r.clean.priority, 'A');
  assert.equal(r.clean.use_cases, 'solar,tower'); // unknown value dropped
  assert.equal(r.clean.source, 'reel');
});
