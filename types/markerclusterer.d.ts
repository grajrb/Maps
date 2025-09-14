declare module '@googlemaps/markerclusterer' {
  import { Map as GoogleMap } from 'google.maps';
  export class MarkerClusterer {
    constructor(options: { map: google.maps.Map, markers?: google.maps.Marker[] });
    addMarker(marker: google.maps.Marker): void;
    addMarkers(markers: google.maps.Marker[]): void;
    clearMarkers(): void;
  }
  export default MarkerClusterer;
}
