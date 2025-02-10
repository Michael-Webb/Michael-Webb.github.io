define([], function () {
    "use strict";
  
    class DocumentsOnline {
      /**
       * Called by Cognos to initialize the control.
       *
       * @param {object} oControlHost - The Cognos control host.
       * @param {function} fnDoneInitializing - Callback indicating initialization is complete.
       */
      initialize(oControlHost, fnDoneInitializing) {
        this.oControlHost = oControlHost;
        const config = oControlHost.configuration;
        this.sServerUrl          = config['Server Url'];
        this.sDevUrl             = config['Development Server Url'];
        //Icon Dimensions
        this.iconHeight          = config['Icon Height']
        this.iconWidth         = config['Icon Width']

        this.useExclude          = config.Use_Exclude;
        this.excludeValue        = config.Exclude_Value;

        // Create a cache (Map) for requests keyed by the full fetch URL.
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
       * Inserts a loading icon (clock SVG) wrapped in an anchor element into the target container.
       *
       * @param {string} elementId - The ID of the span element.
       */
      showLoadingIcon(elementId) {
        const container = document.getElementById(elementId);
        if (!container) return;
        const link = document.createElement("a");
        link.id = `${elementId}link`;
        // Insert the inline clock SVG with dimensions from configuration.
        link.innerHTML = DocumentsOnline.getClockSVG(this.iconWidth, this.iconHeight);
        container.setAttribute("data-status", "document loading");
        container.appendChild(link);
      }
  
      /**
       * Replaces the loading icon with a paperclip icon and sets the hyperlink's destination.
       *
       * @param {string} elementId - The ID of the span element.
       * @param {string} destinationUrl - The URL parsed from the XML response.
       */
      updatePaperclip(elementId, destinationUrl) {
        const link = document.getElementById(`${elementId}link`);
        if (link) {
          link.href = destinationUrl;
          link.target = "_blank";
          // Replace the clock SVG with the paperclip SVG using configured dimensions.
          link.innerHTML = DocumentsOnline.getPaperclipSVG(this.iconWidth, this.iconHeight);
        }
        const container = document.getElementById(elementId);
        if (container) {
          container.setAttribute("data-status", "document found");
        }
      }
  
      /**
       * Removes the loading icon if no document was found.
       *
       * @param {string} elementId - The ID of the span element.
       */
      removeLoadingIcon(elementId) {
        const container = document.getElementById(elementId);
        if (!container) return;
        const link = document.getElementById(`${elementId}link`);
        if (link) {
          link.remove();
        }
        container.setAttribute("data-status", "no document found");
      }
  
      /**
       * Processes a single span element.
       * If the span has not been processed and is not excluded,
       * it shows the loading icon, builds the fetch URL using the encoding functions,
       * and then either reuses a cached fetch promise or sends a new fetch request.
       * When the promise resolves, it updates the icon to a paperclip (or removes it).
       *
       * @param {HTMLElement} span - The span element to process.
       */
      processSpan(span) {
        const { token, arg, user, env, ref } = span.dataset;
        const elementId = span.id;
        const container = document.getElementById(elementId);
        const currentStatus = container ? container.getAttribute("data-status") : "new";
  
        // Exclude rows based on configuration.
        if (this.useExclude && ref.startsWith(this.excludeValue)) {
          if (container) {
            container.setAttribute("data-status", "no document found");
          }
          return;
        }
  
        // Only process spans that are "new".
        if (currentStatus !== "new") {
          console.log(ref, "already processed:", currentStatus);
          return;
        }
  
        // Show the loading (clock) icon.
        this.showLoadingIcon(elementId);
  
        // Build the URL using the provided encoding functions.
        const cleanArg = DocumentsOnline.url_Decode(arg).replaceAll("\\", "");
        const encodedArg = encodeURI(DocumentsOnline.fEncode(cleanArg));
        const fetchUrl = `${this.sServerUrl}arg=${encodedArg}&env=${DocumentsOnline.url_Decode(env)}`;
  
        // Check the cache for an existing request.
        if (this.requestCache.has(fetchUrl)) {
          this.requestCache.get(fetchUrl)
            .then((data) => {
              if (data === 1) {
                this.removeLoadingIcon(elementId);
                console.log(ref, " no document found (cached)");
              } else {
                const valueEl = data.getElementsByTagName("value")[0];
                const destinationUrl = valueEl ? valueEl.childNodes[0].nodeValue : "";
                this.updatePaperclip(elementId, destinationUrl);
                console.log(ref, " document found (cached):", destinationUrl);
              }
            })
            .catch((error) => {
              console.error("Error fetching data for", ref, error);
            });
          return;
        }
  
        // If not cached, create the fetch promise.
        const promise = fetch(fetchUrl, {
          method: "GET",
          headers: { token: token, user: user },
        })
          .then((response) => response.text())
          .then((text) => {
            if (!text.trim()) {
              return 1;
            }
            return new window.DOMParser().parseFromString(text, "text/xml");
          });
  
        // Cache the promise.
        this.requestCache.set(fetchUrl, promise);
  
        // Process the response.
        promise
          .then((data) => {
            if (data === 1) {
              this.removeLoadingIcon(elementId);
              console.log(ref, " no document found");
            } else {
              const valueEl = data.getElementsByTagName("value")[0];
              const destinationUrl = valueEl ? valueEl.childNodes[0].nodeValue : "";
              this.updatePaperclip(elementId, destinationUrl);
              console.log(ref, " document found:", destinationUrl);
            }
          })
          .catch((error) => {
            console.error("Error fetching data for", ref, error);
          });
      }
  
      /**
       * Sets up lazy loading for all spans with name="attachments".
       * An IntersectionObserver watches each span, and when it scrolls into view,
       * processSpan is called and the element is unobserved.
       */
      setupLazyLoading() {
        const spans = document.querySelectorAll("span[name='attachments']");
        if ("IntersectionObserver" in window) {
          const observerOptions = { threshold: 0.1 };
          const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                this.processSpan(entry.target);
                observer.unobserve(entry.target);
              }
            });
          }, observerOptions);
          spans.forEach((span) => {
            observer.observe(span);
          });
        } else {
          // Fallback: process all spans immediately if IntersectionObserver isn't supported.
          spans.forEach((span) => {
            this.processSpan(span);
          });
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
  