// @ts-nocheck
// Minimal google.maps mock for unit tests (enough for CustomMap tests)
export const google = {
  maps: {
    Map: class {
      constructor(el: any, opts: any) { this._center = opts.center; this._zoom = opts.zoom; }
      setCenter() {}
      setZoom() {}
    },
    Marker: class {
      constructor(opts: any) { this._pos = opts.position || { lat: opts.position?.lat || 0, lng: opts.position?.lng || 0 }; this._map = opts.map || null; this._title = opts.title || undefined; this._animation = null; }
      getPosition() { return { lat: () => this._pos.lat, lng: () => this._pos.lng }; }
      getTitle() { return this._title; }
      setMap(m: any) { this._map = m; }
      getMap() { return this._map; }
      addListener(_ev: string, cb: any) { /* no-op for tests */ }
      setAnimation(anim: any) { this._animation = anim; }
    },
    InfoWindow: class {
      constructor(opts: any) { this._content = opts.content; }
      open() {}
    },
    LatLngBounds: class {
      constructor() { this._points = []; }
      extend() { }
    },
    event: {
      addListener() { }
    },
    Animation: {
      BOUNCE: 'BOUNCE'
    }
  }
};

// Provide globals that some modules may reference
(global as any).google = (global as any).google || (google as any).maps ? (global as any).google : { maps: google.maps };
