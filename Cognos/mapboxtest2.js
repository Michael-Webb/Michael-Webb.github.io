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
          `;
      const $c = $(container);
      $c.css({ position: "relative", width: "100%", height: "400px" });
      document.head.appendChild(style);
      // 2) inject the Mapbox CSS
      $("head").append(
        `<link href="https://api.tiles.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet" />`
      );
      BasicControl._stylesInjected = true;

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
        this.buildLocationList(this.geojsonFeature);
      });

      fnDoneInitializing();
    }

    draw(oControlHost) {

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
        const nameCol = oControlHost.configuration.Name?.trim()         || "Name";
        const latCol  = oControlHost.configuration.Latitude?.trim()     || "Latitude";
        const lngCol  = oControlHost.configuration.Longitude?.trim()    || "Longitude";
        // NEW: an array of extra‐properties you want to pull in
        const propCols = Array.isArray(oControlHost.configuration.properties)
          ? oControlHost.configuration.properties.map(p => p.trim())
          : [];
      
        // 2) Lookup their indices
        const iName = oDataStore.getColumnIndex(nameCol);
        const iLat  = oDataStore.getColumnIndex(latCol);
        const iLng  = oDataStore.getColumnIndex(lngCol);
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
          const rawLat  = oDataStore.getCellValue(row, iLat);
          const rawLng  = oDataStore.getCellValue(row, iLng);
      
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
            props[col] = idx != null
              ? oDataStore.getCellValue(row, idx)
              : null;
          }
      
          this.geojsonFeature.features.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [lng, lat] },
            properties: props
          });
        }
      
        // assign a numeric id on each feature
        this.geojsonFeature.features.forEach((f, i) => f.properties.id = i);
      
        // stash the list of extra columns for later
        this._extraProps = propCols;
      
        this._dataReady = true;
      }
      
      buildLocationList(stores) {
        const listings = document.getElementById("listings");
        for (const feature of stores.features) {
          const { properties } = feature;
          const listing = listings.appendChild(document.createElement("div"));
          listing.id        = `listing-${properties.id}`;
          listing.className = "item";
      
          // title
          const link = listing.appendChild(document.createElement("a"));
          link.href      = "#";
          link.className = "title";
          link.innerText = properties.name;
      
          // details container
          const details = listing.appendChild(document.createElement("div"));
      
          // Now dynamically append each extra prop
          for (const col of this._extraProps) {
            const val = properties[col];
            if (val != null && val !== "") {
              const row = document.createElement("div");
              row.innerText = `${col}: ${val}`;
              details.appendChild(row);
            }
          }
        }
      }
      
  }

  return BasicControl;
});
//v9