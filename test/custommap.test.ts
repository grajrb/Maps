import './utils/google-maps-mock';
import { describe, it, expect, beforeEach } from 'vitest';
import { CustomMap } from '../src/CustomMap';
import { User } from '../src/User';
import { Company } from '../src/company';

describe('CustomMap', () => {
  let map: CustomMap;
  beforeEach(() => {
    // create a fake container element
    const el = document.createElement('div');
    el.id = 'map-test';
    document.body.appendChild(el);
    map = new CustomMap('map-test', { lat: 0, lng: 0 }, 2);
  });

  it('adds user and company markers and exposes metadata', () => {
    const u = new User('Alice', { lat: 1.0, long: 2.0 });
    const c = new Company('Acme', { lat: 3.0, long: 4.0 });
    const mu = map.addMarker(u);
    const mc = map.addMarker(c);
    expect(map.getMarkers().length).toBeGreaterThanOrEqual(2);
    const metaU = map.getMarkerMeta(mu as any);
    const metaC = map.getMarkerMeta(mc as any);
    expect(metaU).toBeTruthy();
    expect(metaC).toBeTruthy();
  });

  it('can toggle visibility for users and companies', () => {
    const u = new User('Bob', { lat: 5, long: 6 });
    const c = new Company('Biz', { lat: 7, long: 8 });
    map.addMarker(u);
    map.addMarker(c);
    map.showUsers(false);
    map.showCompanies(false);
    const list = map.getMarkers();
    expect(list.every(l => l.visible === false)).toBe(true);
  });
});
