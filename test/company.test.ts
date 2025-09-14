import { describe, it, expect } from 'vitest';
import { Company } from '../src/company';

describe('Company.fromJSON', () => {
  it('rehydrates name, address and location correctly', () => {
    const payload = { name: 'Acme', location: { lat: 9.87, long: 6.54 }, address: '456 Market St', avatarUrl: 'https://example.com/c.png' };
    const c = Company.fromJSON(payload as any);
    expect(c.name).toBe('Acme');
    expect(c.address).toBe('456 Market St');
    expect(c.location.lat).toBeCloseTo(9.87);
    expect(c.avatarUrl).toBe('https://example.com/c.png');
  });
});
