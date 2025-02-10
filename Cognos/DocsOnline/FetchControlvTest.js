define([], function () {
    "use strict";
  
    class DocumentsOnline {
      /**
       * Called by Cognos to initialize the control.
       * Reads configuration for URLs, icon dimensions, caching, and other options.
       *
       * @param {object} oControlHost - The Cognos control host.
       * @param {function} fnDoneInitializing - Callback indicating initialization is complete.
       */
      initialize(oControlHost, fnDoneInitializing) {
        this.oControlHost = oControlHost;
        const config = oControlHost.configuration;
        this.sServerUrl   = config["Server Url"];
        this.sDevUrl      = config["Development Server Url"];
        this.isDevMode    = config["Dev Mode"];
  
        // Icon dimensions
        this.iconHeight   = config["Icon Height"];
        this.iconWidth    = config["Icon Width"];
  
        this.useExclude   = config.Use_Exclude;
        this.excludeValue = config.Exclude_Value;
  
        // New flag to decide whether to use sessionStorage for caching.
        this.useSessionStorage = config["UseSessionStorage"];
  
        // Create an in-memory cache for requests keyed by the full fetch URL.
        this.requestCache = new Map();
        fnDoneInitializing();
      }
  
      /**
       * Called by Cognos when the control should render itself.
       * Sets up lazy loading so that a fetch request is only sent for an attachment
       * when its span scrolls into view.
       *
       * @param {object} oControlHost - The Cognos control host.
       */
      draw(oControlHost) {
        this.setupLazyLoading();
      }
  
      /**
       * Inserts a loading (clock) icon (as inline SVG) wrapped in an anchor element
       * into the container element (which is the span itself).
       *
       * @param {HTMLElement} container - The span element to update.
       */
      showLoadingIcon(container) {
        if (!container) return;
        const link = document.createElement("a");
        link.id = `${container.id}link`;
        link.innerHTML = DocumentsOnline.getClockSVG(this.iconWidth, this.iconHeight);
        container.setAttribute("data-status", "document loading");
        container.appendChild(link);
      }
  
      /**
       * Replaces the loading icon with a paperclip icon and sets the hyperlink's destination.
       *
       * @param {HTMLElement} container - The span element to update.
       * @param {string} destinationUrl - The URL parsed from the XML response.
       */
      updatePaperclip(container, destinationUrl) {
        if (!container) return;
        const link = container.querySelector(`#${container.id}link`);
        if (link) {
          link.href = destinationUrl;
          link.target = "_blank";
          link.innerHTML = DocumentsOnline.getPaperclipSVG(this.iconWidth, this.iconHeight);
        }
        container.setAttribute("data-status", "document found");
      }
  
      /**
       * Removes the loading icon if no document was found.
       *
       * @param {HTMLElement} container - The span element to update.
       */
      removeLoadingIcon(container) {
        if (!container) return;
        const link = container.querySelector(`#${container.id}link`);
        if (link) link.remove();
        container.setAttribute("data-status", "no document found");
      }
  
      /**
       * Processes a single span element.
       * Shows the loading icon, builds the fetch URL using encoding functions,
       * then either reuses a cached request (in memory and/or sessionStorage) or sends a new one.
       * When the promise resolves, it updates the icon accordingly.
       *
       * @param {HTMLElement} span - The span element to process.
       */
      processSpan(span) {
        const { token, arg, user, env, ref } = span.dataset;
        const currentStatus = span.getAttribute("data-status") || "new";
  
        // Exclude rows based on configuration.
        if (this.useExclude && ref.startsWith(this.excludeValue)) {
          span.setAttribute("data-status", "no document found");
          return;
        }
  
        // Only process spans that are "new".
        if (currentStatus !== "new") {
          console.log(ref, "already processed:", currentStatus);
          return;
        }
  
        // Show the loading icon.
        this.showLoadingIcon(span);
  
        // Build the URL.
        const cleanArg = DocumentsOnline.url_Decode(arg).replace(/\\/g, "");
        const encodedArg = encodeURI(DocumentsOnline.fEncode(cleanArg));
        const baseUrl = this.isDevMode ? this.sDevUrl : this.sServerUrl;
        const fetchUrl = `${baseUrl}arg=${encodedArg}&env=${DocumentsOnline.url_Decode(env)}`;
        const storageKey = "DocumentsOnlineCache:" + fetchUrl;
  
        // Define a common response processor.
        const processResponse = (data) => {
          if (data === 1) {
            this.removeLoadingIcon(span);
            console.log(ref, " no document found");
          } else {
            const valueEl = data.getElementsByTagName("value")[0];
            const destinationUrl = valueEl ? valueEl.childNodes[0].nodeValue : "";
            this.updatePaperclip(span, destinationUrl);
            console.log(ref, " document found:", destinationUrl);
          }
        };
  
        // If sessionStorage is enabled, check for a stored response.
        if (this.useSessionStorage && sessionStorage.getItem(storageKey) !== null) {
          const storedText = sessionStorage.getItem(storageKey);
          const cachedData = storedText === "1" 
            ? 1 
            : new window.DOMParser().parseFromString(storedText, "text/xml");
          const promise = Promise.resolve(cachedData);
          this.requestCache.set(fetchUrl, promise);
          promise.then(processResponse)
            .catch(error => console.error("Error fetching data for", ref, error));
          return;
        }
  
        // Check our in-memory cache.
        if (this.requestCache.has(fetchUrl)) {
          this.requestCache.get(fetchUrl)
            .then(processResponse)
            .catch(error => console.error("Error fetching data for", ref, error));
          return;
        }
  
        // If not cached, fetch from the network.
        const promise = fetch(fetchUrl, {
          method: "GET",
          headers: { token: token, user: user }
        })
          .then(response => response.text())
          .then(text => {
            // If sessionStorage is enabled, store the raw response text.
            if (this.useSessionStorage) {
              sessionStorage.setItem(storageKey, text);
            }
            return !text.trim() 
              ? 1 
              : new window.DOMParser().parseFromString(text, "text/xml");
          });
  
        // Cache the promise in our in-memory Map.
        this.requestCache.set(fetchUrl, promise);
  
        promise.then(processResponse)
          .catch(error => console.error("Error fetching data for", ref, error));
      }
  
      /**
       * Sets up lazy loading for all spans with name="attachments".
       * An IntersectionObserver watches each span, and when it scrolls into view,
       * processSpan is called and the span is then unobserved.
       */
      setupLazyLoading() {
        const spans = document.querySelectorAll("span[name='attachments']");
        if ("IntersectionObserver" in window) {
          const observerOptions = { threshold: 0.1 };
          const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                this.processSpan(entry.target);
                observer.unobserve(entry.target);
              }
            });
          }, observerOptions);
          spans.forEach(span => observer.observe(span));
        } else {
          // Fallback: process all spans immediately if IntersectionObserver isn't supported.
          spans.forEach(span => this.processSpan(span));
        }
      }
  
      // --- DO NOT CHANGE THE FOLLOWING ENCODING FUNCTIONS ---
  
      static fEncode(vValue) {
        var Base64 = {
          _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
          encode: function (e) {
            var t = "";
            var n, r, i, s, o, u, a;
            var f = 0;
            e = Base64._utf8_encode(e);
            while (f < e.length) {
              n = e.charCodeAt(f++);
              r = e.charCodeAt(f++);
              i = e.charCodeAt(f++);
              s = n >> 2;
              o = ((n & 3) << 4) | (r >> 4);
              u = ((r & 15) << 2) | (i >> 6);
              a = i & 63;
              if (isNaN(r)) {
                u = a = 64;
              } else if (isNaN(i)) {
                a = 64;
              }
              t =
                t +
                this._keyStr.charAt(s) +
                this._keyStr.charAt(o) +
                this._keyStr.charAt(u) +
                this._keyStr.charAt(a);
            }
            return t;
          },
          decode: function (e) {
            var t = "";
            var n, r, i;
            var s, o, u, a;
            var f = 0;
            e = e.replace(/[^A-Za-z0-9\+\/\=]/g, "");
            while (f < e.length) {
              s = this._keyStr.indexOf(e.charAt(f++));
              o = this._keyStr.indexOf(e.charAt(f++));
              u = this._keyStr.indexOf(e.charAt(f++));
              a = this._keyStr.indexOf(e.charAt(f++));
              n = (s << 2) | (o >> 4);
              r = ((o & 15) << 4) | (u >> 2);
              i = ((u & 3) << 6) | a;
              t = t + String.fromCharCode(n);
              if (u != 64) {
                t = t + String.fromCharCode(r);
              }
              if (a != 64) {
                t = t + String.fromCharCode(i);
              }
            }
            t = Base64._utf8_decode(t);
            return t;
          },
          _utf8_encode: function (e) {
            e = e.replace(/\r\n/g, "\n");
            var t = "";
            for (var n = 0; n < e.length; n++) {
              var r = e.charCodeAt(n);
              if (r < 128) {
                t += String.fromCharCode(r);
              } else if (r > 127 && r < 2048) {
                t += String.fromCharCode((r >> 6) | 192);
                t += String.fromCharCode((r & 63) | 128);
              } else {
                t += String.fromCharCode((r >> 12) | 224);
                t += String.fromCharCode(((r >> 6) & 63) | 128);
                t += String.fromCharCode((r & 63) | 128);
              }
            }
            return t;
          },
          _utf8_decode: function (e) {
            var t = "";
            var n = 0;
            var r = (c1 = c2 = 0);
            while (n < e.length) {
              r = e.charCodeAt(n);
              if (r < 128) {
                t += String.fromCharCode(r);
                n++;
              } else if (r > 191 && r < 224) {
                c2 = e.charCodeAt(n + 1);
                t += String.fromCharCode(((r & 31) << 6) | (c2 & 63));
                n += 2;
              } else {
                c2 = e.charCodeAt(n + 1);
                c3 = e.charCodeAt(n + 2);
                t += String.fromCharCode(
                  ((r & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63)
                );
                n += 3;
              }
            }
            return t;
          },
        };
        var encodedString = Base64.encode(vValue);
        return encodedString;
      }
    
      static url_Decode(str) {
        return decodeURIComponent(str.replaceAll("+", " "));
      }
    
      /**
       * Returns the clock SVG markup with the given width and height.
       *
       * @param {number|string} width - The desired width.
       * @param {number|string} height - The desired height.
       * @returns {string} The inline SVG markup.
       */
      static getClockSVG(width, height) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
      }
    
      /**
       * Returns the paperclip SVG markup with the given width and height.
       *
       * @param {number|string} width - The desired width.
       * @param {number|string} height - The desired height.
       * @returns {string} The inline SVG markup.
       */
      static getPaperclipSVG(width, height) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-paperclip"><path d="M13.234 20.252 21 12.3"/><path d="m16 6-8.414 8.586a2 2 0 0 0 0 2.828 2 2 0 0 0 2.828 0l8.414-8.586a4 4 0 0 0 0-5.656 4 4 0 0 0-5.656 0l-8.415 8.585a6 6 0 1 0 8.486 8.486"/></svg>`;
      }
    }
    
    return DocumentsOnline;
  });
  