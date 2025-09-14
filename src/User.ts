import { faker } from "@faker-js/faker";

export class User {
  name: string;
  location: {
    lat: number;
    long: number;
  }
  address: string;
  avatarUrl: string;

  constructor(name?: string, location?: { lat: number; long: number }) {
    // Prefer provided values; fall back to faker when missing
    this.name = name || faker.name.firstName();
    this.location = location ? { lat: location.lat, long: location.long } : { lat: Number(faker.address.latitude()), long: Number(faker.address.longitude()) };
    this.address = (location && false) ? '' : (faker.address.streetAddress() + ', ' + faker.address.city());
    this.avatarUrl = `https://i.pravatar.cc/150?u=${encodeURIComponent(this.name)}`;
  }

  markerContent() {
    return `<div class="info-card"><div class="info-avatar" style="background-image:url('${this.avatarUrl}'); background-size:cover"></div><div class="info-body"><strong>${this.name}</strong><div>${this.address}</div><div>(${this.location.lat.toFixed(3)}, ${this.location.long.toFixed(3)})</div><div class="info-actions"><button data-action="zoom">Zoom</button></div></div></div>`;
  }

  static fromJSON(obj: any) {
    const u = new User(obj.name || 'User', obj.location || { lat: 0, long: 0 });
    if (obj.location && typeof obj.location.lat === 'number') u.location.lat = obj.location.lat;
    if (obj.location && typeof obj.location.long === 'number') u.location.long = obj.location.long;
    if (obj.address) u.address = obj.address;
    if (obj.avatarUrl) u.avatarUrl = obj.avatarUrl;
    return u;
  }
}