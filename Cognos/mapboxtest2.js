define(["https://api.tiles.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js", "jquery"], function (mapboxgl, $) {
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

              .listings {
                  height: 100%;
                  overflow: auto;
                  padding-bottom: 60px;
                  }

              .listings .item {
                    border-bottom: 1px solid #eee;
                    padding: 10px;
                    text-decoration: none;
                    }

                    .listings .item:last-child {
                    border-bottom: none;
                    }

                    .listings .item .title {
                    display: block;
                    color: #00853e;
                    font-weight: 700;
                    }

                    .listings .item .title small {
                    font-weight: 400;
                    }

                    .listings .item.active .title,
                    .listings .item .title:hover {
                    color: #8cc63f;
                    }

                    .listings .item.active {
                    background-color: #f8f8f8;
                    }

                    ::-webkit-scrollbar {
                    width: 3px;
                    height: 3px;
                    border-left: 0;
                    background: rgba(0 0 0 0.1);
                    }

                    ::-webkit-scrollbar-track {
                    background: none;
                    }

                    ::-webkit-scrollbar-thumb {
                    background: #00853e;
                    border-radius: 0;
                    }
            /* Marker tweaks */
.mapboxgl-popup-close-button {
  display: none;
}

.mapboxgl-popup-content {
  font:
    400 15px/22px 'Source Sans Pro',
    'Helvetica Neue',
    sans-serif;
  padding: 0;
  width: 180px;
}

.mapboxgl-popup-content h3 {
  background: #91c949;
  color: #fff;
  margin: 0;
  padding: 10px;
  border-radius: 3px 3px 0 0;
  font-weight: 700;
  margin-top: -15px;
}

.mapboxgl-popup-content h4 {
  margin: 0;
  padding: 10px;
  font-weight: 400;
}

.mapboxgl-popup-content div {
  padding: 10px;
}

.mapboxgl-popup-anchor-top > .mapboxgl-popup-content {
  margin-top: 15px;
}

.mapboxgl-popup-anchor-top > .mapboxgl-popup-tip {
  border-bottom-color: #91c949;
}
          `;
      const $c = $(container);
      $c.css({ position: "relative", width: "100%", height: "400px" });
      document.head.appendChild(style);
      // 2) inject the Mapbox CSS
      if (!BasicControl._stylesInjected) {
        $("head").append(
          `<link href="https://api.tiles.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet" />`
        );
        BasicControl._stylesInjected = true;
      }

      // 3) create the map
      mapboxgl.accessToken = oControlHost.configuration.Key || "";

      this.map = new mapboxgl.Map({
        container: container.querySelector("#map"),
        style: "mapbox://styles/mapbox/light-v11",
        center: [30, 15],
        zoom: 1,
      });
      this.map.addControl(new mapboxgl.NavigationControl());
      this.map.scrollZoom.disable();

      this.map.on("load", () => {
        /* Add the data to your map as a layer */
        this.map.addLayer({
          id: "locations",
          type: "circle",
          /* Add a GeoJSON source containing place coordinates and information. */
          source: {
            type: "geojson",
            data: this.geojsonFeature,
          },
        });

        this.map.on("click", (event) => {
          /* Determine if a feature in the "locations" layer exists at that point. */
          const features = this.map.queryRenderedFeatures(event.point, {
            layers: ["locations"],
          });

          /* If it does not exist, return */
          if (!features.length) return;

          const clickedPoint = features[0];

          /* Fly to the point */
          this.flyToStore(clickedPoint);

          /* Close all other popups and display popup for clicked store */
          this.createPopUp(clickedPoint);

          /* Highlight listing in sidebar (and remove highlight for all other listings) */
          const activeItem = document.getElementsByClassName("active");
          if (activeItem[0]) {
            activeItem[0].classList.remove("active");
          }
          const listing = document.getElementById(`listing-${clickedPoint.properties.id}`);
          listing.classList.add("active");
        });
        this.buildLocationList(this.geojsonFeature);
      });

      fnDoneInitializing();
    }

    draw(oControlHost) {}

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
      // NEW: an array of extra‐properties you want to pull in
      const propCols = Array.isArray(oControlHost.configuration.Properties)
        ? oControlHost.configuration.Properties.map((p) => p.trim())
        : [];

      // 2) Lookup their indices
      const iName = oDataStore.getColumnIndex(nameCol);
      const iLat = oDataStore.getColumnIndex(latCol);
      const iLng = oDataStore.getColumnIndex(lngCol);
      const propIndices = {};
      for (const col of propCols) {
        const idx = oDataStore.getColumnIndex(col);
        if (Number.isNaN(idx)) {
          console.warn(`BasicControl.setData: missing property column "${col}"`);
        } else {
          propIndices[col] = idx;
        }
      }

      // 3) Bail out early if any of the three essentials are missing
      if ([iName, iLat, iLng].some(Number.isNaN)) {
        console.error("BasicControl.setData: missing core column(s)", { nameCol, latCol, lngCol });
        return;
      }

      // 4) Build your GeoJSON
      this.geojsonFeature = { type: "FeatureCollection", features: [] };

      for (let row = 0; row < oDataStore.rowCount; row++) {
        const rawName = oDataStore.getCellValue(row, iName);
        const rawLat = oDataStore.getCellValue(row, iLat);
        const rawLng = oDataStore.getCellValue(row, iLng);

        const lat = parseFloat(rawLat),
          lng = parseFloat(rawLng);

        if (!rawName || Number.isNaN(lat) || Number.isNaN(lng)) {
          console.warn(`BasicControl.setData: skipping row ${row}`, { rawName, rawLat, rawLng });
          continue;
        }

        // assemble the properties object
        const props = { name: rawName };
        for (const col of propCols) {
          const idx = propIndices[col];
          props[col] = idx != null ? oDataStore.getCellValue(row, idx) : null;
        }

        this.geojsonFeature.features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [lng, lat] },
          properties: props,
        });
      }

      // assign a numeric id on each feature
      this.geojsonFeature.features.forEach((f, i) => (f.properties.id = i));

      // stash the list of extra columns for later
      this._extraProps = propCols;

      this._dataReady = true;
    }

    buildLocationList(stores) {
      const self = this;
      const listings = document.getElementById("listings");
      for (const feature of stores.features) {
        const { properties } = feature;
        const listing = listings.appendChild(document.createElement("div"));
        listing.id = `listing-${properties.id}`;
        listing.className = "item";

        // title
        const link = listing.appendChild(document.createElement("a"));
        link.id = `link-${properties.id}`;
        link.href = "#";
        link.className = "title";
        link.innerText = properties.name;

        link.addEventListener("click", function (evt) {
          // use self instead of this
          self.flyToStore(feature);
          self.createPopUp(feature);

          // toggle active class
          const prev = listings.querySelector(".item.active");
          if (prev) prev.classList.remove("active");
          listing.classList.add("active");

          evt.preventDefault();
        });

        // details container
        const details = listing.appendChild(document.createElement("div"));
        for (const col of self._extraProps) {
          const val = properties[col];
          if (val != null && val !== "") {
            const row = document.createElement("div");
            row.innerText = `${col}: ${val}`;
            details.appendChild(row);
          }
        }
      }
    }
    flyToStore(currentFeature) {
      this.map.flyTo({
        center: currentFeature.geometry.coordinates,
        zoom: 15,
      });
    }

    createPopUp(currentFeature) {
      const popUps = document.getElementsByClassName("mapboxgl-popup");
      /** Check if there is already a popup on the map and if so, remove it */
      if (popUps[0]) popUps[0].remove();

      const popup = new mapboxgl.Popup({ closeOnClick: false })
        .setLngLat(currentFeature.geometry.coordinates)
        .setHTML(`<h3>Sweetgreen</h3><h4>${currentFeature.properties.address}</h4>`)
        .addTo(this.map);
    }
  }

  return BasicControl;
});
//v15