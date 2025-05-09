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
      this._container = oControlHost.container;
      const container = oControlHost.container;
      const cid = oControlHost.container.id;
      // Set basic layout styles for the container
      container.style.display = "flex";
      //   container.style.height = "100%";
      //   container.style.width = "100%";

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
                max-height: 200px;      /* ← new */
                overflow-y: auto;       /* ← new */

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

                .marker {
                border: none;
                cursor: pointer;
                height: 24px;
                width: 24px;
                }
                .mapboxgl-popup {
                padding-bottom: 50px;
                }
          `;
      const $c = $(container);
      $c.css({ position: "relative", width: "100%" });
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
        // center: [30, 15],
        zoom: 1,
      });
      this.map.addControl(new mapboxgl.NavigationControl());
      this.map.scrollZoom.disable();

      this.map.on("load", () => {
        this.map.addSource("places", {
          type: "geojson",
          data: this.geojsonFeature,
        });
        // 2) fit the map to the data bounds
        const bounds = new mapboxgl.LngLatBounds();
        this.geojsonFeature.features.forEach((f) => {
          bounds.extend(f.geometry.coordinates);
        });
        this.map.fitBounds(bounds, {
          padding: 40,
          maxZoom: 12, // optional: don’t zoom in past this
          duration: 0, // optional: set to 0 for no animation
        });
        // 3️⃣ stash for later resets
        this._initialBounds = bounds;
        this._initialPadding = 40;

        this.addMarkers();
        this.buildLocationList(this.geojsonFeature);

        this.map.on("click", () => {
          // reset the view
          this.map.fitBounds(this._initialBounds, {
            padding: this._initialPadding,
            duration: 300,
          });

          // deselect any active listing
          const prev = this._container.querySelector(".listings .item.active");
          if (prev) prev.classList.remove("active");
        });
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
      // 1️⃣ Remove any existing popups
      const popUps = document.getElementsByClassName("mapboxgl-popup");
      if (popUps[0]) popUps[0].remove();

      // 2️⃣ Build dynamic HTML from all feature properties
      const props = currentFeature.properties;
      let html = `<h3>${props.name}</h3>`;
      html += `<div class="popup-body">`;
      for (const [key, value] of Object.entries(props)) {
        if (key === "name" || key === "id") continue; // skip name/id if you like
        html += `<div><strong>${key}</strong>: ${value}</div>`;
      }
      html += `</div>`;

      // 3️⃣ Create and add the popup to the map
      const popup = new mapboxgl.Popup({ closeOnClick: true, maxWidth: "300px" })
        .setLngLat(currentFeature.geometry.coordinates)
        .setHTML(html)
        .addTo(this.map);
      // whenever the popup closes, clear the sidebar
      popup.on("close", () => {
        const prev = this._container.querySelector(".listings .item.active");
        if (prev) prev.classList.remove("active");
      });

      // 4️⃣ Prevent clicks inside the popup from bubbling up to the map
      popup.getElement().addEventListener("click", (e) => e.stopPropagation());
    }

    addMarkers() {
      // if no data, bail
      if (!this.geojsonFeature || !Array.isArray(this.geojsonFeature.features)) {
        console.warn("BasicControl.addMarkers: no features to render");
        return;
      }

      for (const feature of this.geojsonFeature.features) {
        const el = document.createElement("div");
        el.id = `marker-${feature.properties.id}`;
        el.className = "marker";

        // 2️⃣ inject the SVG directly
        el.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" 
           width="24" height="24" viewBox="0 0 24 24" 
           fill="none" stroke="currentColor" stroke-width="2" 
           stroke-linecap="round" stroke-linejoin="round" 
           class="lucide lucide-map-pin-icon lucide-map-pin">
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    `;

        el.addEventListener("click", (evt) => {
          // fly & popup
          this.flyToStore(feature);
          this.createPopUp(feature);

          // highlight sidebar
          const prev = document.querySelector(".item.active");
          if (prev) prev.classList.remove("active");
          const listing = document.getElementById(`listing-${feature.properties.id}`);
          if (listing) listing.classList.add("active");

          evt.stopPropagation();
        });

        new mapboxgl.Marker(el, { offset: [0, -23] }).setLngLat(feature.geometry.coordinates).addTo(this.map);
      }
    }
    destroy() {
      // 1) remove map event listeners & the map
      if (this.map) {
        this.map.off("load").off("click"); // remove your background‐click handler
        this.markers.forEach((m) => m.remove()); // clear any Marker DOM
        this.map.remove(); // fully tear down Mapbox
        this.map = null;
      }

      // 2) clear out your sidebar listings
      if (this._container) {
        const listings = this._container.querySelector(".listings");
        if (listings) {
          listings.innerHTML = ""; // strips out all listing <div>s & their click listeners
        }
      }
    }
  }

  return BasicControl;
});
//v27