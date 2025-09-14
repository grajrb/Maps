import { describe, it, expect } from 'vitest';
import { User } from '../src/User';

describe('User.fromJSON', () => {
  it('rehydrates name, address and location correctly', () => {
    const payload = { name: 'Alice', location: { lat: 1.23, long: 4.56 }, address: '123 Main St', avatarUrl: 'https://example.com/a.png' };
    const u = User.fromJSON(payload as any);
    expect(u.name).toBe('Alice');
    expect(u.address).toBe('123 Main St');
    expect(u.location.lat).toBeCloseTo(1.23);
    expect(u.avatarUrl).toBe('https://example.com/a.png');
  });
});
