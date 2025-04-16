/* Cognos AMD custom control — Mapbox GL v 3.11.0 (class syntax, NO GeoJSON) */
define(["https://api.mapbox.com/mapbox-gl-js/v3.11.0/mapbox-gl.js", "jquery"], function (mapboxgl, $) {
  "use strict";

  class BasicControl {
    constructor() {
      this.map = null;
      this.bounds = null;
      this.points = []; // [{ name, lng, lat }]
      this.markers = []; // keep references if you need to clear later
      this._userInteracting = false;
    }

    initialize(oControlHost, fnDoneInitializing) {
      // Inject Mapbox GL stylesheet
      $("head link[rel='stylesheet']")
        .last()
        .after("<link href='https://api.mapbox.com/mapbox-gl-js/v3.11.0/mapbox-gl.css' rel='stylesheet' />");

      const containerId = oControlHost.container.id;
      mapboxgl.accessToken = oControlHost.configuration.Key; // token from Cognos param

      this.map = new mapboxgl.Map({
        container: containerId,
        style: "mapbox://styles/mapbox/streets-v9",
        projection: "globe",
        center: [30, 15],
        zoom: 1,
        interactive: true,
      });

      this.map.addControl(new mapboxgl.NavigationControl());
      this.map.scrollZoom.disable();
      this.map.on("style.load", () => this.map.setFog({}));

      this.bounds = new mapboxgl.LngLatBounds();
      this._addAutoSpin();

      fnDoneInitializing();
    }

    draw(oControlHost) {
      /* Create plain Mapbox GL markers instead of a GeoJSON source */
      this.map.once("load", () => {
        this.points.forEach((p) => {
          const marker = new mapboxgl.Marker({ color: "#B42222" })
            .setLngLat([p.lng, p.lat])
            .setPopup(new mapboxgl.Popup({ offset: 20 }).setText(p.name)) // optional
            .addTo(this.map);

          this.markers.push(marker);
          this.bounds.extend([p.lng, p.lat]);
        });

        if (!this.bounds.isEmpty()) {
          this.map.fitBounds(this.bounds, { padding: 40 });
        }
      });
    }

    setData(oControlHost, oDataStore) {
      // Clear previous data
      this.points = [];
      this.bounds = new mapboxgl.LngLatBounds();
      const NAME_COL = oControlHost.configuration.NameCol || "Name";
      const LNG_COL = oControlHost.configuration.LongitudeCol || "Longitude";
      const LAT_COL = oControlHost.configuration.LatitudeCol || "Latitude";

      /* Resolve those names to indexes once. */
      const idxName = oDataStore.getColumnIndex(NAME_COL);
      const idxLng  = oDataStore.getColumnIndex(LNG_COL);
      const idxLat  = oDataStore.getColumnIndex(LAT_COL);

      /* Loop through rows and grab by index. */
      for (let i = 0, rows = oDataStore.rowCount; i < rows; i++) {
        this.points.push({
          name: oDataStore.getCellValue(i, idxName),
          lng:  parseFloat(oDataStore.getCellValue(i, idxLng)),
          lat:  parseFloat(oDataStore.getCellValue(i, idxLat))
        });
      }
    }
    _addAutoSpin() {
      const secondsPerRev = 240,
        maxSpinZoom = 5,
        slowSpinZoom = 3;

      const spin = () => {
        const z = this.map.getZoom();
        if (!this._userInteracting && z < maxSpinZoom) {
          let degPerSec = 360 / secondsPerRev;
          if (z > slowSpinZoom) {
            degPerSec *= (maxSpinZoom - z) / (maxSpinZoom - slowSpinZoom);
          }
          const center = this.map.getCenter();
          center.lng -= degPerSec;
          this.map.easeTo({ center, duration: 1000, easing: (n) => n });
        }
      };

      this.map.on("mousedown", () => (this._userInteracting = true));
      this.map.on("dragstart", () => (this._userInteracting = true));
      this.map.on("moveend", spin);

      spin(); // kick‑off
    }
  }

  return BasicControl;
});
