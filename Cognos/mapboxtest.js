define(["https://api.mapbox.com/mapbox-gl-js/v3.11.0/mapbox-gl.js", "jquery"], function (mapboxgl, $) {
  "use strict";

  class BasicControl {
    constructor() {
      this.map = null;
      this.points = [];
      this.markers = [];
      this._userInteracting = false;
      this._dataReady = false;
    }

    initialize(oControlHost, fnDoneInitializing) {
      const cid = oControlHost.container.id;
      const $c = $("#" + cid);
      // 1) make sure the div has height
      $c.css({ position: "relative", width: "100%", height: "400px" });

      // 2) inject the Mapbox CSS
      $("head").append(`<link href="https://api.mapbox.com/mapbox-gl-js/v3.11.0/mapbox-gl.css" rel="stylesheet" />`);

      // 3) create the map
      mapboxgl.accessToken = oControlHost.configuration.Key || "";
      this.map = new mapboxgl.Map({
        container: cid,
        style: "mapbox://styles/mapbox/streets-v9",
        projection: "globe",
        center: [30, 15],
        zoom: 1,
      });
      this.map.addControl(new mapboxgl.NavigationControl());
      this.map.scrollZoom.disable();

      // 4) when it’s ready, set fog and draw if data is already set
      this.map.on("load", () => {
        this.map.setFog({});
        if (this._dataReady) this._drawMarkers();
        fnDoneInitializing();
      });

      this._addAutoSpin();
    }

    setData(oControlHost, oDataStore) {
      // 1) Read & trim your configured column‑names (fallback to defaults)
      const nameCol = oControlHost.configuration.Name?.trim() || "Name";
      const latCol = oControlHost.configuration.Latitude?.trim() || "Latitude";
      const lngCol = oControlHost.configuration.Longitude?.trim() || "Longitude";

      // 2) Lookup their indices (→ NaN if not found)
      const iName = oDataStore.getColumnIndex(nameCol);
      const iLat = oDataStore.getColumnIndex(latCol);
      const iLng = oDataStore.getColumnIndex(lngCol);

      // 3) Bail out early if any are missing
      if (Number.isNaN(iName) || Number.isNaN(iLat) || Number.isNaN(iLng)) {
        console.error(
          "BasicControl.setData: missing column(s)",
          { nameCol, iName },
          { latCol, iLat },
          { lngCol, iLng }
        );
        return;
      }

      // 4) Build the points array, skipping rows with bad data
      this.points = [];
      for (let row = 0; row < oDataStore.rowCount; row++) {
        const rawName = oDataStore.getCellValue(row, iName);
        const rawLat = oDataStore.getCellValue(row, iLat);
        const rawLng = oDataStore.getCellValue(row, iLng);

        const lat = parseFloat(rawLat),
          lng = parseFloat(rawLng);

        if (rawName == null || rawName === "" || Number.isNaN(lat) || Number.isNaN(lng)) {
          console.warn(`BasicControl.setData: skipping row ${row}`, { rawName, rawLat, rawLng });
          continue;
        }

        this.points.push({ name: rawName, lat, lng });
      }

      // 5) Flag that data is ready for your draw logic
      this._dataReady = true;
    }

    draw(oControlHost) {
      // if map already loaded, draw immediately; otherwise queue it
      if (this.map.loaded()) {
        this._drawMarkers();
      } else {
        this.map.once("load", () => this._drawMarkers());
      }
    }

    _drawMarkers() {
      if (this.points.length === 0) {
        console.warn("BasicControl: no points to draw");
        return;
      }

      // clear out old markers
      this.markers.forEach((m) => m.remove());
      this.markers = [];

      const bounds = new mapboxgl.LngLatBounds();
      this.points.forEach((p) => {
        const m = new mapboxgl.Marker({ color: "#B42222" })
          .setLngLat([p.lng, p.lat])
          .setPopup(new mapboxgl.Popup({ offset: 20 }).setText(p.name))
          .addTo(this.map);
        this.markers.push(m);
        bounds.extend([p.lng, p.lat]);
      });

      if (!bounds.isEmpty()) {
        this.map.fitBounds(bounds, { padding: 40 });
      }
    }

    _addAutoSpin() {
      const secondsPerRev = 240,
        maxZoom = 5,
        slowZoom = 3;
      const spin = () => {
        const z = this.map.getZoom();
        if (!this._userInteracting && z < maxZoom) {
          let dps = 360 / secondsPerRev;
          if (z > slowZoom) dps *= (maxZoom - z) / (maxZoom - slowZoom);
          const c = this.map.getCenter();
          c.lng -= dps;
          this.map.easeTo({ center: c, duration: 1000, easing: (n) => n });
        }
      };
      this.map.on("mousedown", () => (this._userInteracting = true));
      this.map.on("dragstart", () => (this._userInteracting = true));
      this.map.on("moveend", spin);
      spin();
    }
  }

  return BasicControl;
});
//v1
