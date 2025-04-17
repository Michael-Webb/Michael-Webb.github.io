define(["https://api.tiles.mapbox.com/mapbox-gl-js/v3.11.0/mapbox-gl.js", "jquery"], function (mapboxgl, $) {
  "use strict";

  class BasicControl {
    constructor() {
      this.map = null;
      this.points = [];
      this.markers = [];
      this._userInteracting = false;
      this._dataReady = false;
    }
    static _stylesInjected = false;

    initialize(oControlHost, fnDoneInitializing) {
      const container = oControlHost.container;
      const cid = oControlHost.container.id;
      // Set basic layout styles for the container
      container.style.display = "flex";
      container.style.height = "500px";
      container.style.width = "100%";

      // Create the HTML structure inside the container
      container.innerHTML = `
          <div class="sidebar"> 
              <div class="heading"> 
              <h1>Our locations</h1> 
              </div> 
              <div id="listings" class="listings"></div>
          </div>
          <div id="map" class="map"></div>
          `;

      // Add some basic CSS to make the layout work
      const style = document.createElement("style");
      style.textContent = `
           h1 {
                  font-size: 22px;
                  margin: 0;
                  font-weight: 400;
                  line-height: 20px;
                  padding: 20px 2px;
              }
  
              a {
                  color: #404040;
                  text-decoration: none;
              }
  
              a:hover {
                  color: #101010;
              }
                  
              .sidebar {
                  position: absolute;
                  width: 33.3333%;
                  height: 100%;
                  top: 0;
                  left: 0;
                  overflow: hidden;
                  border-right: 1px solid rgb(0 0 0 / 25%);
              }
  
              .map {
                  position: absolute;
                  left: 33.3333%;
                  width: 66.6666%;
                  top: 0;
                  bottom: 0;
              }
  
              .heading {
                  background: #fff;
                  border-bottom: 1px solid #eee;
                  height: 60px;
                  line-height: 60px;
                  padding: 0 10px;
              }
          `;
      const $c = $(container);
      $c.css({ position: "relative", width: "100%", height: "400px" });
      document.head.appendChild(style);
      // 2) inject the Mapbox CSS
      $("head").append(`<link href="https://api.mapbox.com/mapbox-gl-js/v3.11.0/mapbox-gl.css" rel="stylesheet" />`);
      BasicControl._stylesInjected = true;

      // 3) create the map
      mapboxgl.accessToken = oControlHost.configuration.Key || "";

      this.map = new mapboxgl.Map({
        container: container.querySelector("#map"),
        style: "mapbox://styles/mapbox/light-11",
        center: [30, 15],
        zoom: 1,
      });
      this.map.addControl(new mapboxgl.NavigationControl());
      this.map.scrollZoom.disable();

      this.map.on("load", () => {
        /* Add the data to your map as a layer */
        map.addLayer({
          id: "locations",
          type: "circle",
          /* Add a GeoJSON source containing place coordinates and information. */
          source: {
            type: "geojson",
            data: this.geojsonFeature,
          },
        });
      });

      fnDoneInitializing();
    }

    draw(oControlHost) {
      // if map already loaded, draw immediately; otherwise queue it
      //   if (this.map.loaded()) {
      //     this._drawMarkers();
      //   } else {
      //     this.map.once("load", () => this._drawMarkers());
      //   }
      // }
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

      this.geojsonFeature = {
        type: "FeatureCollection",
        features: [],
      };

      var iRowCount = oDataStore.rowCount;
      for (var iRow = 0; iRow < iRowCount; iRow++) {
        var feature = {};
        feature["type"] = "Feature";
        feature["geometry"] = {
          type: "Point",
          coordinates: [
            parseFloat(oDataStore.getCellValue(iRow, iLat)),
            parseFloat(oDataStore.getCellValue(iRow, iLng)),
          ],
        };
        feature["properties"] = { name: oDataStore.getCellValue(iRow, iName) };
        this.geojsonFeature["features"].push(feature);
      }
      this.geojsonFeature.features.forEach(function (location, i) {
        location.properties.id = i;
      });

      this._dataReady = true;
    }
  }

  return BasicControl;
});
//v3