/// <reference types="@types/google.maps" />
import { User } from './User';
import { Company } from './company';
import { CustomMap } from './CustomMap';

// Initialize the map only when the Google Maps API has loaded. The script tag in index.html
// uses &callback=initMap which will call this function once the API is ready.
declare global {
  interface Window {
    initMap?: () => void;
    __realInitMap?: () => void;
    _gmaps_init_ready?: boolean;
  }
}

function createMap() {
  const customMap = new CustomMap('map', { lat: 0, lng: 0 }, 1);

  const user = new User('John Doe', { lat: 0, long: 0 });
  const company = new Company('Acme Corp', { lat: 0, long: 0 });

  customMap.addMarker(user);
  customMap.addMarker(company);

  // Populate marker list
  const markerList = document.getElementById('marker-list');
  function refreshList() {
    if (!markerList) return;
    markerList.innerHTML = '';
    customMap.getMarkers().forEach(m => {
      const div = document.createElement('div');
      div.style.padding = '6px 0';
      div.className = 'marker-row';
      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center">
          <div>
            <strong class="marker-title">${m.title || 'Unnamed'}</strong>
            <div style="font-size:12px;color:#666">${m.position ? `${m.position.lat.toFixed(3)}, ${m.position.lng.toFixed(3)}` : ''}</div>
          </div>
          <div style="display:flex; gap:6px; align-items:center">
            <input type="checkbox" class="marker-visible" ${m.visible ? 'checked' : ''} />
            <button class="zoom-btn" data-idx="${m.index}">Zoom</button>
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
          </div>
        </div>`;

      const zoomBtn = div.querySelector('.zoom-btn') as HTMLButtonElement | null;
      zoomBtn?.addEventListener('click', () => customMap.zoomToMarker(m.index));

      const visibleCheckbox = div.querySelector('.marker-visible') as HTMLInputElement | null;
      visibleCheckbox?.addEventListener('change', (ev) => {
        const show = (ev.target as HTMLInputElement).checked;
        // Simple heuristic: toggle by index by updating the marker's map
        const markers = (customMap as any).markers as google.maps.Marker[];
        const marker = markers[m.index];
        if (marker) marker.setMap(show ? (customMap as any).googleMap : null);
        (customMap as any).refreshCluster?.();
      });

      const deleteBtn = div.querySelector('.delete-btn') as HTMLButtonElement | null;
      deleteBtn?.addEventListener('click', () => {
        const markers = (customMap as any).markers as google.maps.Marker[];
        const marker = markers[m.index];
        if (marker) {
          marker.setMap(null);
          markers.splice(m.index, 1);
          (customMap as any).userMarkers = (customMap as any).userMarkers.filter((x: any) => x !== marker);
          (customMap as any).companyMarkers = (customMap as any).companyMarkers.filter((x: any) => x !== marker);
          (customMap as any).refreshCluster?.();
          refreshList();
        }
      });

      const editBtn = div.querySelector('.edit-btn') as HTMLButtonElement | null;
      editBtn?.addEventListener('click', () => {
        // Open modal editor
        const markers = (customMap as any).markers as google.maps.Marker[];
        const marker = markers[m.index];
        if (!marker) return;
        const meta = (customMap as any).getMarkerMeta(marker) || {};
        const modal = document.getElementById('modal-backdrop') as HTMLElement | null;
        const modalTitle = document.getElementById('modal-title') as HTMLInputElement | null;
        const modalAddress = document.getElementById('modal-address') as HTMLInputElement | null;
        const modalAvatarUrl = document.getElementById('modal-avatar-url') as HTMLInputElement | null;
        const modalAvatar = document.getElementById('modal-avatar') as HTMLElement | null;
        const modalSave = document.getElementById('modal-save') as HTMLButtonElement | null;
        const modalCancel = document.getElementById('modal-cancel') as HTMLButtonElement | null;
        if (!modal || !modalTitle || !modalAddress || !modalAvatarUrl || !modalAvatar || !modalSave || !modalCancel) return;
        modalTitle.value = marker.getTitle() || '';
        modalAddress.value = meta.address || '';
        modalAvatarUrl.value = meta.avatarUrl || '';
        modalAvatar.style.backgroundImage = `url('${modalAvatarUrl.value || ''}')`;
        modal.style.display = 'flex';
        // Accessibility: focus trap and Esc to close
        const focusable = Array.from(modal.querySelectorAll('input, button')) as HTMLElement[];
        let lastFocused: Element | null = document.activeElement;
        focusable[0]?.focus();
        const onKey = (ev: KeyboardEvent) => {
          if (ev.key === 'Escape') { cleanupModal(); }
          if (ev.key === 'Tab' && focusable.length > 0) {
            // simple focus trap
            const idx = focusable.indexOf(document.activeElement as HTMLElement);
            if (ev.shiftKey) {
              if (idx <= 0) { ev.preventDefault(); const last = focusable[focusable.length - 1]; last && last.focus(); }
            } else {
              if (idx === focusable.length - 1) { ev.preventDefault(); const first = focusable[0]; first && first.focus(); }
            }
          }
        };
        document.addEventListener('keydown', onKey);
        const onAvatarChange = () => { modalAvatar.style.backgroundImage = `url('${modalAvatarUrl.value || ''}')`; };
        modalAvatarUrl.addEventListener('input', onAvatarChange);
        const cleanupModal = () => {
          modal.style.display = 'none';
          modalAvatarUrl.removeEventListener('input', onAvatarChange);
          document.removeEventListener('keydown', onKey);
          lastFocused && (lastFocused as HTMLElement).focus();
        };
        modalCancel.addEventListener('click', cleanupModal, { once: true });
        // backdrop click closes modal
        modal.addEventListener('click', (ev) => { if (ev.target === modal) cleanupModal(); }, { once: true });
        modalSave.addEventListener('click', () => {
          const newTitle = modalTitle.value || marker.getTitle() || '';
          const newAddress = modalAddress.value || '';
          const newAvatar = modalAvatarUrl.value || '';
          marker.setTitle(newTitle);
          customMap.setMarkerMeta(marker, { address: newAddress, avatarUrl: newAvatar });
          const iw = (marker as any).__infoWindow as google.maps.InfoWindow | undefined;
          if (iw) {
            const pos = marker.getPosition();
            const infoHtml = `<div class="info-card"><div class="info-avatar" style="background-image:url('${newAvatar}'); background-size:cover"></div><div class="info-body"><strong>${newTitle}</strong><div>${newAddress}</div><div>(${pos?.lat().toFixed(3)}, ${pos?.lng().toFixed(3)})</div><div class="info-actions"><button data-action="zoom">Zoom</button></div></div></div>`;
            iw.setContent(infoHtml);
          }
          cleanupModal();
          refreshList();
        }, { once: true });
      });

      markerList.appendChild(div);
    });
  }
  refreshList();

  // Wire controls
  const usersToggle = document.getElementById('toggle-users') as HTMLInputElement | null;
  const companiesToggle = document.getElementById('toggle-companies') as HTMLInputElement | null;
  if (usersToggle) usersToggle.addEventListener('change', () => customMap.showUsers(usersToggle.checked));
  if (companiesToggle) companiesToggle.addEventListener('change', () => customMap.showCompanies(companiesToggle.checked));

  // Persist toggles to localStorage
  if (usersToggle) {
    usersToggle.addEventListener('change', () => {
      try { localStorage.setItem('map.showUsers', String(usersToggle.checked)); } catch (e) {}
      customMap.showUsers(usersToggle.checked);
    });
  }
  if (companiesToggle) {
    companiesToggle.addEventListener('change', () => {
      try { localStorage.setItem('map.showCompanies', String(companiesToggle.checked)); } catch (e) {}
      customMap.showCompanies(companiesToggle.checked);
    });
  }

  // Restore saved toggle state if present
  try {
    const su = localStorage.getItem('map.showUsers');
    const sc = localStorage.getItem('map.showCompanies');
    if (su !== null && usersToggle) { usersToggle.checked = su === 'true'; customMap.showUsers(usersToggle.checked); }
    if (sc !== null && companiesToggle) { companiesToggle.checked = sc === 'true'; customMap.showCompanies(companiesToggle.checked); }
  } catch (e) {}

  const fitBtn = document.getElementById('fit-bounds') as HTMLButtonElement | null;
  if (fitBtn) fitBtn.addEventListener('click', () => customMap.fitToVisible());

  const applyFilter = document.getElementById('apply-filter') as HTMLButtonElement | null;
  if (applyFilter) {
    applyFilter.addEventListener('click', () => {
      const km = Number((document.getElementById('filter-km') as HTMLInputElement).value || 0);
      const lat = Number((document.getElementById('filter-lat') as HTMLInputElement).value || 0);
      const lng = Number((document.getElementById('filter-lng') as HTMLInputElement).value || 0);
      customMap.filterByDistance({ lat, long: lng }, km);
    });
  }

  // Export / Import
  const exportBtn = document.getElementById('export-data') as HTMLButtonElement | null;
  const saveProjectBtn = document.getElementById('save-project') as HTMLButtonElement | null;
  const importFile = document.getElementById('import-file') as HTMLInputElement | null;
  // Import status / progress UI (in index.html there's an input#import-file)
  let importStatusEl: HTMLElement | null = document.getElementById('import-status');
  if (!importStatusEl) {
    // create a small status area near the import control if not present
    const importContainer = document.getElementById('import-container');
    if (importContainer) {
      importStatusEl = document.createElement('div');
      importStatusEl.id = 'import-status';
      importStatusEl.style.fontSize = '12px';
      importStatusEl.style.marginTop = '6px';
      importContainer.appendChild(importStatusEl);
    }
  }
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      // Build a richer export format: include type, title, position, and any metadata available
      // We attempt to read address/avatar from the underlying objects if present
      const markers = (customMap as any).markers as google.maps.Marker[];
      const payload = markers.map((marker: google.maps.Marker, i: number) => {
        const title = marker.getTitle();
        const pos = marker.getPosition();
        const meta = (customMap as any).getMarkerMeta(marker) || {};
        const type = meta.type || ((customMap as any).userMarkers.includes(marker) ? 'User' : 'Company');
        return {
          type,
          title,
          position: pos ? { lat: pos.lat(), lng: pos.lng() } : null,
          visible: !!marker.getMap(),
          address: meta.address,
          avatarUrl: meta.avatarUrl,
        };
      });
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'markers.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  }
  const exportGeoJSONBtn = document.getElementById('export-geojson') as HTMLButtonElement | null;
  const exportCsvBtn = document.getElementById('export-csv') as HTMLButtonElement | null;
  const loadProjectBtn = document.getElementById('load-project') as HTMLButtonElement | null;
  const searchBox = document.getElementById('search-box') as HTMLInputElement | null;
  const searchGo = document.getElementById('search-go') as HTMLButtonElement | null;

  const toCSV = (arr: any[]) => {
    if (!arr.length) return '';
    const keys = Object.keys(arr[0]);
    const lines = [keys.join(',')];
    for (const r of arr) lines.push(keys.map(k => JSON.stringify(r[k] ?? '')).join(','));
    return lines.join('\n');
  };

  if (exportGeoJSONBtn) {
    exportGeoJSONBtn.addEventListener('click', () => {
      const markers = (customMap as any).markers as google.maps.Marker[];
      const featureCollection = { type: 'FeatureCollection', features: markers.map((m) => { const p = m.getPosition(); const meta = (customMap as any).getMarkerMeta(m) || {}; return { type: 'Feature', properties: { title: m.getTitle(), ...meta }, geometry: p ? { type: 'Point', coordinates: [p.lng(), p.lat()] } : null }; }) };
      const blob = new Blob([JSON.stringify(featureCollection, null, 2)], { type: 'application/geo+json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'markers.geojson'; a.click(); URL.revokeObjectURL(url);
    });
  }
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      const markers = (customMap as any).markers as google.maps.Marker[];
      const rows = markers.map(m => { const p = m.getPosition(); const meta = (customMap as any).getMarkerMeta(m) || {}; return { title: m.getTitle(), lat: p?.lat(), lng: p?.lng(), type: meta.type, address: meta.address, avatarUrl: meta.avatarUrl }; });
      const csv = toCSV(rows);
      const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'markers.csv'; a.click(); URL.revokeObjectURL(url);
    });
  }

  if (loadProjectBtn) {
    loadProjectBtn.addEventListener('click', () => {
      try {
        const raw = localStorage.getItem('map.lastExport');
        if (!raw) { showToast('No saved project found', true); return; }
        const parsed = JSON.parse(raw);
        // reuse import logic: create objects and add markers
        parsed.forEach((item: any) => {
          if (item.type === 'User') {
            const u = User.fromJSON({ name: item.title, location: { lat: item.position?.lat || 0, long: item.position?.lng || 0 }, address: item.address, avatarUrl: item.avatarUrl });
            const m = customMap.addMarker(u as any);
            if (m) customMap.setMarkerMeta(m, { address: u.address, avatarUrl: u.avatarUrl, type: 'User' });
          } else if (item.type === 'Company') {
            const c = Company.fromJSON({ name: item.title, location: { lat: item.position?.lat || 0, long: item.position?.lng || 0 }, address: item.address, avatarUrl: item.avatarUrl });
            const m = customMap.addMarker(c as any);
            if (m) customMap.setMarkerMeta(m, { address: c.address, avatarUrl: c.avatarUrl, type: 'Company' });
          }
        });
        refreshList();
      } catch (e) { showToast('Failed to load project', true); }
    });
  }

  if (searchGo && searchBox) {
    searchGo.addEventListener('click', () => {
      const q = searchBox.value.trim();
      if (!q) return;
      if ((window as any).google && (window as any).google.maps && (window as any).google.maps.Geocoder) {
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ address: q }, (results: any) => {
          if (!results || !results[0]) { showToast('No results found', true); return; }
          const loc = results[0].geometry.location;
          const u = new User(q, { lat: loc.lat(), long: loc.lng() });
          const m = customMap.addMarker(u as any);
          if (m) customMap.setMarkerMeta(m, { address: results[0].formatted_address || '', avatarUrl: u.avatarUrl, type: 'User' });
          refreshList();
        });
      } else {
        showToast('Geocoding not available (Maps API not loaded)', true);
      }
    });
  }
    if (saveProjectBtn) {
      saveProjectBtn.addEventListener('click', () => {
        try {
          const markers = (customMap as any).markers as google.maps.Marker[];
          const payload = markers.map((marker: google.maps.Marker, i: number) => {
            const title = marker.getTitle();
            const pos = marker.getPosition();
            const meta = (customMap as any).getMarkerMeta(marker) || {};
            const type = meta.type || ((customMap as any).userMarkers.includes(marker) ? 'User' : 'Company');
            return { type, title, position: pos ? { lat: pos.lat(), lng: pos.lng() } : null, visible: !!marker.getMap(), address: meta.address, avatarUrl: meta.avatarUrl };
          });
          localStorage.setItem('map.lastExport', JSON.stringify(payload));
          showToast('Project saved to localStorage');
        } catch (e) { showToast('Failed to save project', true); }
      });
    }
  if (importFile) {
    importFile.addEventListener('change', (ev) => {
      const f = (ev.target as HTMLInputElement).files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = async () => {
        let parsed: any = null;
        // helper to set status
        const setStatus = (s: string) => { if (importStatusEl) importStatusEl.textContent = s; };
        const clearStatus = () => { if (importStatusEl) importStatusEl.textContent = ''; };
        // ensure controls are re-enabled on all exit paths
        const enableControls = () => { try { exportBtn && (exportBtn.disabled = false); importFile && (importFile.disabled = false); } catch (e) {} };
        try {
          parsed = JSON.parse(String(reader.result));
          if (!Array.isArray(parsed)) {
            showToast('Imported file must be a JSON array', true);
            return;
          }
        } catch (e) {
          console.error('Failed to parse import file', e);
          showToast('Invalid JSON file', true);
          enableControls();
          return;
        }

        // Optional zod validation if available; if zod is present, surface detailed errors
        let schemaOk = true;
        let zodIssues: any = null;
        try {
          // @ts-ignore - zod may not be installed in this workspace; import dynamically if present
          const zodMod: any = await import('zod');
          const z = zodMod.z;
          const itemSchema = z.object({ type: z.string(), title: z.string().optional(), position: z.object({ lat: z.number(), lng: z.number() }).optional(), visible: z.boolean().optional(), address: z.string().optional(), avatarUrl: z.string().optional() });
          const arrSchema = z.array(itemSchema);
          arrSchema.parse(parsed);
          schemaOk = true;
        } catch (e) {
          if ((e as any)?.issues) {
            schemaOk = false;
            zodIssues = (e as any).issues;
          } else {
            // zod not installed or import failed — continue with best-effort import
            schemaOk = true;
          }
        }

        if (!schemaOk) {
          // show concise zod validation errors in preview modal and toast
          const msg = `Validation failed: ${(zodIssues || []).slice(0,3).map((x: any)=> x.message).join('; ')}` || 'Imported file failed schema validation';
          setStatus(msg);
          showToast(msg, true);
          // open preview modal with errors
          const preview = document.getElementById('import-preview-backdrop') as HTMLElement | null;
          const errEl = document.getElementById('import-preview-errors') as HTMLElement | null;
          if (preview && errEl) {
            errEl.textContent = msg;
            preview.style.display = 'flex';
            preview.setAttribute('aria-hidden', 'false');
          }
          enableControls();
          return;
        }

        // disable controls during import
        exportBtn && (exportBtn.disabled = true);
        importFile && (importFile.disabled = true);
        setStatus(`Importing 0 / ${parsed.length}...`);
        let imported = 0;
        try {
          // if preview modal is present, show a preview and allow dry-run / import
          const preview = document.getElementById('import-preview-backdrop') as HTMLElement | null;
          const previewList = document.getElementById('import-preview-list') as HTMLElement | null;
          const previewImport = document.getElementById('import-preview-import') as HTMLButtonElement | null;
          const previewDry = document.getElementById('import-preview-dryrun') as HTMLButtonElement | null;
          const previewCancel = document.getElementById('import-preview-cancel') as HTMLButtonElement | null;
          if (preview && previewList) {
            previewList.innerHTML = parsed.map((it: any, idx: number) => `<div style="padding:4px;border-bottom:1px solid #eee">${idx+1}. ${it.type} - ${it.title || ''} (${it.position?.lat || 0}, ${it.position?.lng || 0})</div>`).join('');
            preview.style.display = 'flex';
            preview.setAttribute('aria-hidden', 'false');
            const closePreview = () => { preview.style.display = 'none'; preview.setAttribute('aria-hidden', 'true'); };
            previewCancel && previewCancel.addEventListener('click', () => { closePreview(); enableControls(); }, { once: true });
            previewDry && previewDry.addEventListener('click', async () => { showToast('Dry-run completed'); closePreview(); enableControls(); }, { once: true });
            previewImport && previewImport.addEventListener('click', () => { closePreview(); /* proceed with import loop below */ }, { once: true });
          }
          for (let idx = 0; idx < parsed.length; idx++) {
            const item = parsed[idx];
            setStatus(`Importing ${idx + 1} / ${parsed.length}...`);
            try {
              if (!item || !item.type) continue;
              if (item.type === 'User') {
                const mod = await import('./User');
                const u = mod.User.fromJSON({ name: item.title, location: { lat: item.position?.lat || 0, long: item.position?.lng || 0 }, address: item.address, avatarUrl: item.avatarUrl });
                const added = customMap.addMarker(u as any);
                if (added) customMap.setMarkerMeta(added, { address: u.address, avatarUrl: u.avatarUrl, type: 'User' });
                imported++;
              } else if (item.type === 'Company') {
                const mod = await import('./company');
                const c = mod.Company.fromJSON({ name: item.title, location: { lat: item.position?.lat || 0, long: item.position?.lng || 0 }, address: item.address, avatarUrl: item.avatarUrl });
                const added = customMap.addMarker(c as any);
                if (added) customMap.setMarkerMeta(added, { address: c.address, avatarUrl: c.avatarUrl, type: 'Company' });
                imported++;
              } else {
                // unknown type: ignore but report
                console.warn('Unknown item type during import', item?.type);
              }
            } catch (e) {
              console.error('Failed to import item', item, e);
            }
          }
        } finally {
          refreshList();
          setStatus(`Imported ${imported} / ${parsed.length}`);
          showToast(`Imported ${imported} items`);
          // re-enable controls
          enableControls();
          // clear status after a short delay
          setTimeout(clearStatus, 2500);
        }
      };
      reader.readAsText(f);
    });
  }

  // Circle filter tool
  let filterCircle: google.maps.Circle | null = null;
  const startCircle = document.getElementById('start-circle') as HTMLButtonElement | null;
  // Helper: create circle from center/radius and wire controls (reused by manual create and restore)
  const createAndWireCircle = (center: google.maps.LatLngLiteral, radiusMeters: number) => {
    filterCircle = new google.maps.Circle({ center, radius: radiusMeters, editable: true, draggable: true, map: (customMap as any).googleMap });
    startCircle && (startCircle.textContent = 'Remove circle');
    const circleControls = document.getElementById('circle-controls');
    if (circleControls) circleControls.style.display = 'block';
    // reuse the existing listeners by triggering the same events (listeners are attached where circle is created)
    // apply filter immediately
    applyCircleFilter();
  };
  if (startCircle) {
    startCircle.addEventListener('click', () => {
      if (filterCircle) {
        filterCircle.setMap(null);
        filterCircle = null;
        startCircle.textContent = 'Draw filter circle';
        // reset visibility
        customMap.showUsers(true);
        customMap.showCompanies(true);
        return;
      }

      startCircle.textContent = 'Click map to place circle';
      const once = customMap['googleMap'] ? customMap['googleMap'] : null;
      // Wait for a click on the map to place center
      const listener = (e: google.maps.MapMouseEvent) => {
        const center = e.latLng!;
        // create via helper to ensure wiring and persistence
        createAndWireCircle({ lat: center.lat(), lng: center.lng() }, 100000);
        startCircle!.textContent = 'Remove circle';
        // Show controls for radius and wire slider
        const circleControls = document.getElementById('circle-controls');
        const radiusReadout = document.getElementById('circle-radius-readout');
        const radiusSlider = document.getElementById('circle-radius-slider') as HTMLInputElement | null;
        if (circleControls) circleControls.style.display = 'block';
        const metersToKm = (m: number) => Math.round((m / 100) ) / 10; // one decimal
        const kmToMeters = (km: number) => Math.max(0.1, km) * 1000;

        // Unit toggle: when checked show meters; when unchecked show km
        const unitToggle = document.getElementById('circle-unit-toggle') as HTMLInputElement | null;
        const formatReadout = (meters: number) => {
          if (!radiusReadout) return '';
          if (unitToggle && unitToggle.checked) {
            return `${Math.round(meters)} m`;
          }
          const km = metersToKm(meters);
          return `${km} km`;
        };

        const syncUIFromCircle = () => {
          if (!filterCircle) return;
          const rMeters = filterCircle.getRadius();
          if (radiusReadout) radiusReadout.textContent = formatReadout(rMeters);
          if (radiusSlider) {
            // slider range is in km, keep one decimal as value
            const val = Math.min(Number(radiusSlider.max), Math.max(Number(radiusSlider.min), Number((rMeters / 1000).toFixed(1))));
            radiusSlider.value = String(val);
          }
        };

        const onSliderInput = () => {
          if (!filterCircle || !radiusSlider) return;
          const km = Number(radiusSlider.value || 0);
          filterCircle.setRadius(kmToMeters(km));
          if (radiusReadout) radiusReadout.textContent = formatReadout(kmToMeters(km));
          applyCircleFilter();
          // persist
          persistCircle();
        };

        // toggle handler
        if (unitToggle) {
          unitToggle.addEventListener('change', () => {
            if (filterCircle && radiusReadout) radiusReadout.textContent = formatReadout(filterCircle.getRadius());
          });
        }

        // When circle edited, apply filter and update UI
        if (filterCircle) {
          const fc = filterCircle;
          fc.addListener('radius_changed', () => { applyCircleFilter(); syncUIFromCircle(); });
          fc.addListener('center_changed', () => { applyCircleFilter(); });
        }

        // wire slider events
        if (radiusSlider) {
          radiusSlider.addEventListener('input', onSliderInput);
          // initialize slider to circle radius (one decimal)
          if (filterCircle) {
            const initKm = (filterCircle.getRadius() / 1000);
            radiusSlider.value = String(Number(initKm.toFixed(1)));
          }
        }

        // initialize readout and persist handlers
        syncUIFromCircle();
        const persistCircle = () => {
          if (!filterCircle) return;
          const center = filterCircle.getCenter();
          if (!center) return;
          const payload = { lat: center.lat(), lng: center.lng(), radius: filterCircle.getRadius() };
          try { localStorage.setItem('map.filterCircle', JSON.stringify(payload)); } catch (e) { }
        };
        // persist on changes
        if (filterCircle) {
          const fc2 = filterCircle;
          fc2.addListener('radius_changed', () => persistCircle());
          fc2.addListener('center_changed', () => persistCircle());
        }

        // remove the click listener
        google.maps.event.clearListeners((customMap as any).googleMap, 'click');
      };
      (customMap as any).googleMap.addListener('click', listener);
    });
  }

  // Restore saved circle if present
  try {
    const saved = localStorage.getItem('map.filterCircle');
    if (saved) {
      const p = JSON.parse(saved);
      if (p && typeof p.lat === 'number' && typeof p.lng === 'number' && typeof p.radius === 'number') {
        // create after a small timeout to ensure map is ready
        setTimeout(() => {
          createAndWireCircle({ lat: p.lat, lng: p.lng }, p.radius);
          // sync UI values if the wiring logic runs after creation
          const radiusSlider = document.getElementById('circle-radius-slider') as HTMLInputElement | null;
          const radiusReadout = document.getElementById('circle-radius-readout');
          if (radiusSlider) radiusSlider.value = String(Number((p.radius / 1000).toFixed(1)));
          if (radiusReadout) radiusReadout.textContent = `${Math.round((p.radius/1000)*10)/10} km`;
        }, 300);
      }
    }
  } catch (e) {}

  function applyCircleFilter() {
    if (!filterCircle) return;
    const c = filterCircle.getCenter()!;
    const r = filterCircle.getRadius(); // meters
    // Convert to km and use filterByDistance
    customMap.filterByDistance({ lat: c.lat(), long: c.lng() }, r / 1000);
  }

  // Simple toast helper
  function showToast(msg: string, isError = false) {
    const holder = document.getElementById('toast');
    if (!holder) return;
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.background = isError ? '#ffdddd' : '#111';
    el.style.color = isError ? '#900' : '#fff';
    el.style.padding = '8px 12px';
    el.style.borderRadius = '6px';
    el.style.marginTop = '8px';
    holder.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity 300ms'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
  }
}

// Register the real initializer and, if the Google script already attempted to call
// initMap earlier, execute immediately.
window.__realInitMap = () => {
  createMap();
};

if (window._gmaps_init_ready) {
  // The Google script called the stub before our module registered the real initializer.
  window.__realInitMap();
}