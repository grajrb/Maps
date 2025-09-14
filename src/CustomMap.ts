/// <reference types="@types/google.maps" />
import { MarkerClusterer } from '@googlemaps/markerclusterer';

export interface Mappable {
  location: {
    lat: number;
    long: number;
  };
  name?: string;
  markerContent?: () => string;
}

export class CustomMap {
  private googleMap: google.maps.Map;
  private markers: google.maps.Marker[] = [];
  private userMarkers: google.maps.Marker[] = [];
  private companyMarkers: google.maps.Marker[] = [];
  private markerCluster?: MarkerClusterer | null = null;
  // metadata registry maps marker -> arbitrary metadata (address, avatarUrl, origin type, etc.)
  private meta = new Map<google.maps.Marker, any>();
  // Simple event hooks for plugins: event -> listeners
  private hooks: Record<string, Array<(...args: any[]) => void>> = {};

  constructor(elementId: string, center: { lat: number; lng: number } = { lat: 0, lng: 0 }, zoom = 1) {
    const el = document.getElementById(elementId);
    if (!el) throw new Error(`Element with id "${elementId}" not found`);
    this.googleMap = new google.maps.Map(el as HTMLElement, {
      center,
      zoom,
    });
  }

  addMarker(mappable: Mappable) {
    const isUser = (mappable as any).constructor && (mappable as any).constructor.name === 'User';
    const iconUrl = isUser
      ? 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
      : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';

    const marker = new google.maps.Marker({
      map: this.googleMap,
      position: { lat: mappable.location.lat, lng: mappable.location.long },
      title: mappable.name || undefined,
      icon: iconUrl,
    });

    // Build InfoWindow content, prefer metadata-driven content if available
    const meta = this.meta.get(marker) || {};
    const content = (mappable.markerContent && mappable.markerContent()) || (mappable.name ? `<div><strong>${mappable.name}</strong></div>` : undefined);
    const infoHtml = meta ? `<div class="info-card"><div class="info-avatar" style="background-image:url('${meta.avatarUrl || (mappable as any).avatarUrl || ''}'); background-size:cover"></div><div class="info-body"><strong>${mappable.name || ''}</strong><div>${meta.address || (mappable as any).address || ''}</div><div>(${mappable.location.lat.toFixed(3)}, ${mappable.location.long.toFixed(3)})</div><div class="info-actions"><button data-action="zoom">Zoom</button></div></div></div>` : content;
    const infoWindow = new google.maps.InfoWindow({ content: infoHtml });

    marker.addListener('click', () => {
      infoWindow.open({ anchor: marker, map: this.googleMap });
    });

    // Wire action buttons inside the InfoWindow once its DOM is ready
    google.maps.event.addListener(infoWindow, 'domready', () => {
      const iw = document.querySelector('.gm-style-iw');
      if (!iw) return;
      const btn = iw.querySelector('button[data-action="zoom"]') as HTMLButtonElement | null;
      if (btn) {
        btn.onclick = () => {
          this.googleMap.setCenter(marker.getPosition() as google.maps.LatLng);
          this.googleMap.setZoom(12);
        };
      }
    });

    // store InfoWindow reference so we can refresh content after edits
    (marker as any).__infoWindow = infoWindow;

    // Track markers so we can toggle them later
    this.markers.push(marker);
    // store metadata if provided on the mappable
    if ((mappable as any).address || (mappable as any).avatarUrl) {
      this.meta.set(marker, { address: (mappable as any).address, avatarUrl: (mappable as any).avatarUrl, type: isUser ? 'User' : 'Company' });
    } else {
      this.meta.set(marker, { type: isUser ? 'User' : 'Company' });
    }
    if (isUser) this.userMarkers.push(marker);
    else this.companyMarkers.push(marker);

    // Update clusterer
    if (!this.markerCluster) {
      this.markerCluster = new MarkerClusterer({ map: this.googleMap, markers: this.markers });
    } else {
      this.markerCluster.addMarker(marker);
    }
    // notify hooks
    (this.hooks['markerAdded'] || []).forEach(fn => { try { fn(marker, mappable); } catch(e) {} });
    return marker;
  }

  // Hook API
  on(ev: string, fn: (...args: any[]) => void) { this.hooks[ev] = this.hooks[ev] || []; this.hooks[ev].push(fn); }
  off(ev: string, fn: (...args: any[]) => void) { this.hooks[ev] = (this.hooks[ev] || []).filter(f => f !== fn); }

  // Metadata helpers
  setMarkerMeta(marker: google.maps.Marker, data: any) {
    const existing = this.meta.get(marker) || {};
    this.meta.set(marker, { ...existing, ...data });
  }

  getMarkerMeta(marker: google.maps.Marker) {
    return this.meta.get(marker) || null;
  }

  showUsers(show: boolean) {
    this.userMarkers.forEach(m => m.setMap(show ? this.googleMap : null));
    this.refreshCluster();
  }

  showCompanies(show: boolean) {
    this.companyMarkers.forEach(m => m.setMap(show ? this.googleMap : null));
    this.refreshCluster();
  }

  private refreshCluster() {
    if (!this.markerCluster) return;
    // Rebuild cluster with currently visible markers
    const visible = this.markers.filter(m => m.getMap());
    this.markerCluster.clearMarkers();
    this.markerCluster.addMarkers(visible);
  }

  fitToVisible() {
    const bounds = new google.maps.LatLngBounds();
    let has = false;
    this.markers.forEach(m => {
      if (m.getMap()) {
        bounds.extend(m.getPosition() as google.maps.LatLng);
        has = true;
      }
    });
    if (has) this.googleMap.fitBounds(bounds);
  }

  // Return a simple summary of markers for sidebar listing
  getMarkers() {
    return this.markers.map((m, i) => ({
      index: i,
      position: m.getPosition() ? { lat: m.getPosition()!.lat(), lng: m.getPosition()!.lng() } : null,
      title: m.getTitle(),
      visible: !!m.getMap(),
    }));
  }

  zoomToMarker(index: number) {
    const m = this.markers[index];
    if (!m) return;
    const pos = m.getPosition();
    if (!pos) return;
    this.googleMap.setCenter(pos);
    this.googleMap.setZoom(14);
    m.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(() => m.setAnimation(null), 1400);
  }

  filterByDistance(center: { lat: number; long: number }, km: number) {
    const R = 6371; // km
    const toRad = (v: number) => (v * Math.PI) / 180;
    this.markers.forEach(m => {
      const pos = m.getPosition();
      if (!pos) return;
      const dLat = toRad(pos.lat() - center.lat);
      const dLon = toRad(pos.lng() - center.long);
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(center.lat)) * Math.cos(toRad(pos.lat())) * Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const dist = R * c;
      m.setMap(dist <= km ? this.googleMap : null);
    });
    this.refreshCluster();
  }
}
