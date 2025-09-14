import { describe, it, expect } from 'vitest';
import { User } from '../src/User';
import { Company } from '../src/company';

describe('import/export', () => {
  it('User.fromJSON and Company.fromJSON rehydrate', () => {
    const pu = { name: 'Alice', location: { lat: 1.23, long: 4.56 }, address: '123 Main St', avatarUrl: 'https://example.com/a.png' };
    const pc = { name: 'Acme', location: { lat: 9.87, long: 6.54 }, address: '456 Market St', avatarUrl: 'https://example.com/c.png' };
    const u = User.fromJSON(pu as any);
    const c = Company.fromJSON(pc as any);
    expect(u.name).toBe('Alice');
    expect(u.address).toBe('123 Main St');
    expect(c.name).toBe('Acme');
    expect(c.address).toBe('456 Market St');
  });
});
