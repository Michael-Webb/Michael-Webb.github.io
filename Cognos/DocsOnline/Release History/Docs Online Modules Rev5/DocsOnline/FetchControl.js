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
      try {
        this.oControlHost = oControlHost;
        const config = oControlHost.configuration;

        // Check if configuration is valid based on dev mode and server URLs
        if (config["Dev Mode"] === true) {
          // In dev mode, we need Development Server Url
          if (!config["Development Server Url"]) {
            console.warn("DocumentsOnline: Dev mode is enabled but no Development Server Url is configured.");
            this.hasValidConfiguration = false;
            throw new scriptableReportError(
              "DocumentsOnline",
              "initialize",
              "Dev mode is enabled but no Development Server Url is configured."
            );
            // Note: Code after throw won't execute, but keeping this pattern for consistency
            fnDoneInitializing();
            return;
          }
        } else {
          // In production mode, we need Server Url
          if (!config["Server Url"]) {
            console.warn("DocumentsOnline: Production mode is active but no Server Url is configured.");
            this.hasValidConfiguration = false;
            throw new scriptableReportError(
              "DocumentsOnline",
              "initialize",
              "Production mode is active but no Server Url is configured."
            );
            fnDoneInitializing();
            return;
          }
        }

        // Continue with normal initialization
        this.hasValidConfiguration = true;
        this.showConsoleMessages = config["Show Console Messages"] ?? true;
        this.sServerUrl = config["Server Url"];
        this.sDevUrl = config["Development Server Url"];
        this.isDevMode = config["Dev Mode"];

        // Icon dimensions.
        this.iconHeight = config["Icon Height"];
        this.iconWidth = config["Icon Width"];

        this.useExclude = config.Use_Exclude;
        this.excludeValue = config.Exclude_Value;
        this.showIconText = config["Show Icon/Text"];
        this.label = config["Label"];
        this.processSpanType = config["Type"];

        // NEW: Add loading mode configuration option
        this.useLazyLoading = config["Use Lazy Loading"] !== false; // Default to true if not specified

        // Create an in-memory cache for requests keyed by the full fetch URL.
        this.requestCache = new Map();
        fnDoneInitializing();
      } catch (error) {
        // Log error but still complete initialization
        console.error("Error during DocumentsOnline initialization:", error);
        this.hasValidConfiguration = false;
        fnDoneInitializing();
      }
    }

    /**
     * Called by Cognos when the control should render itself.
     * Sets up lazy loading so that a fetch request is only sent for an attachment
     * when its span scrolls into view.
     *
     * @param {object} oControlHost - The Cognos control host.
     */
    draw(oControlHost) {
      // Only attempt to set up if we have valid configuration
      if (this.hasValidConfiguration) {
        try {
          this.setupLazyLoading();
        } catch (error) {
          console.error("Error during DocumentsOnline draw:", error);
          // Don't throw, just log the error
        }
      } else {
        console.warn("DocumentsOnline: Skipping draw due to invalid configuration");
      }
    }

    /**
     * Inserts a loading (clock) icon (as inline SVG) wrapped in an anchor element
     * into the container element (which is the span itself).
     *
     * @param {HTMLElement} container - The span element to update.
     */
    showLoadingIcon(container) {
      try {
        if (!container) return;
        const link = document.createElement("a");
        link.id = `${container.id}link`;
        link.innerHTML = DocumentsOnline.getClockSVG(this.iconWidth, this.iconHeight);
        container.setAttribute("data-status", "document loading");
        container.setAttribute("title", "Attachment Loading");
        container.appendChild(link);
      } catch (error) {
        console.error("Error showing loading icon:", error);
        // Don't throw here as this is a non-critical error
      }
    }

    /**
     * Updates the link for an attachment based on the response.
     * Depending on config["Show Icon/Text"], the link's inner content is set as follows:
     * - "Icon Only": the link shows only the paperclip icon.
     * - "Text Only": the link shows only text.
     * - "Icon and Text": the link shows the paperclip icon followed by a space and text.
     *
     * For text, the module uses config["Label"] if provided; otherwise it defaults to "View Attachment".
     * If the configuration value for "Show Icon/Text" is null/empty, it defaults to "Icon Only".
     *
     * @param {HTMLElement} container - The span element to update.
     * @param {string} destinationUrl - The URL parsed from the XML response.
     */
    updatePaperclip(container, destinationUrl) {
      try {
        if (!container) return;

        if (!destinationUrl || typeof destinationUrl !== "string") {
          throw new Error("Invalid destination URL");
        }

        const link = container.querySelector(`#${container.id}link`);
        if (link) {
          link.href = destinationUrl;
          link.target = "_blank";

          // Determine the label text (defaulting to "View Attachment" if necessary)
          const labelText = this.label && this.label.trim() !== "" ? this.label : "View Attachment";
          // Default to "Icon Only" if showIconText is null/empty.
          const mode = this.showIconText && this.showIconText.trim() !== "" ? this.showIconText : "icon";

          let content = "";
          if (mode.toLowerCase() === "icon") {
            content = DocumentsOnline.getPaperclipSVG(this.iconWidth, this.iconHeight);
          } else if (mode.toLowerCase() === "text") {
            content = labelText;
          } else if (mode.toLowerCase() === "both") {
            content = DocumentsOnline.getPaperclipSVG(this.iconWidth, this.iconHeight) + " " + labelText;
          } else {
            // Fallback to "Icon Only"
            content = DocumentsOnline.getPaperclipSVG(this.iconWidth, this.iconHeight);
          }
          link.innerHTML = content;
        } else {
          throw new Error("Link element not found in container");
        }

        container.setAttribute("data-status", "document found");
        container.setAttribute("title", "View Attachment Document");
      } catch (error) {
        console.error("Error updating paperclip:", error);
        this.handleSpanError(container, container.dataset.ref || "unknown", error);
      }
    }

    /**
     * Removes the loading icon if no document was found.
     *
     * @param {HTMLElement} container - The span element to update.
     */
    removeLoadingIcon(container) {
      try {
        if (!container) return;
        const link = container.querySelector(`#${container.id}link`);
        if (link) link.remove();
        container.setAttribute("data-status", "no document found");
      } catch (error) {
        console.error("Error removing loading icon:", error);
        // Don't throw here as this is a non-critical error
      }
    }

    /**
     * Handles errors for individual span elements
     *
     * @param {HTMLElement} span - The span element that encountered an error
     * @param {string} ref - Reference identifier for logging
     * @param {Error} error - The error that occurred
     */
    handleSpanError(span, ref, error) {
      console.error("Error processing attachment", ref, error);

      // Update the span to show error state
      if (span) {
        const link = span.querySelector(`#${span.id}link`);
        if (link) link.innerHTML = DocumentsOnline.getErrorSVG(this.iconWidth, this.iconHeight);
        span.setAttribute("data-status", "error");
        span.setAttribute("title", "Error loading attachment: " + error.message);
      }

      // Don't throw scriptableReportError for individual span errors
      // to prevent the entire report from failing
    }

    /**
     * Processes a single span element using an XML response.
     * Shows the loading icon, builds the fetch URL using encoding functions,
     * then either reuses a cached request or sends a new fetch request.
     * When the promise resolves, it updates the link accordingly.
     *
     * @param {HTMLElement} span - The span element to process.
     */
    processSpanXML(span) {
      try {
        const { token, arg, user, env, ref } = span.dataset;
        const currentStatus = span.getAttribute("data-status") || "new";

        // Validate required data attributes
        if (!token || !arg || !user || !env) {
          throw new Error("Missing required data attributes on span element");
        }

        // Exclude rows based on configuration.
        if (this.useExclude && ref && ref.startsWith(this.excludeValue)) {
          span.setAttribute("data-status", "no document found");
          return;
        }

        // Only process spans that are "new".
        if (currentStatus !== "new" && this.showConsoleMessages == true) {
          console.log(ref, "already processed:", currentStatus);
          return;
        }

        this.showLoadingIcon(span);

        // Build the URL.
        const cleanArg = DocumentsOnline.url_Decode(arg).replace(/\\/g, "");
        const encodedArg = encodeURI(DocumentsOnline.fEncode(cleanArg));
        const baseUrl = this.isDevMode ? this.sDevUrl : this.sServerUrl;

        if (!baseUrl) {
          throw new Error("Server URL is not configured");
        }

        const fetchUrl = `${baseUrl}arg=${encodedArg}&env=${DocumentsOnline.url_Decode(
          env
        )}&user=${user}&token=${token}`;

        // Define a common response processor.
        const processResponse = (data) => {
          if (data === 1) {
            this.removeLoadingIcon(span);
            if (this.showConsoleMessages == true) {
              console.log(ref, " no document found");
            }
          } else {
            try {
              const valueEl = data.getElementsByTagName("value")[0];
              if (!valueEl || !valueEl.childNodes[0]) {
                throw new Error("Invalid XML response format");
              }
              const destinationUrl = valueEl.childNodes[0].nodeValue;
              this.updatePaperclip(span, destinationUrl);
              if (this.showConsoleMessages == true) {
                console.log(ref, " document found:", destinationUrl);
              }
            } catch (error) {
              this.handleSpanError(span, ref, error);
            }
          }
        };

        // Check in-memory cache.
        if (this.requestCache.has(fetchUrl)) {
          this.requestCache
            .get(fetchUrl)
            .then(processResponse)
            .catch((error) => this.handleSpanError(span, ref, error));
          return;
        }

        // If not cached, fetch from the network.
        const promise = fetch(fetchUrl, {
          method: "GET",
          headers: { token: token, user: user },
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
            }
            return response.text();
          })
          .then((text) => {
            if (!text.trim()) return 1;

            try {
              const parsed = new window.DOMParser().parseFromString(text, "text/xml");
              // Check for parser errors
              const parseError = parsed.querySelector("parsererror");
              if (parseError) {
                throw new Error("XML parsing error: " + parseError.textContent);
              }
              return parsed;
            } catch (error) {
              throw new Error("Failed to parse XML response: " + error.message);
            }
          });

        // Cache the promise.
        this.requestCache.set(fetchUrl, promise);

        promise.then(processResponse).catch((error) => this.handleSpanError(span, ref, error));
      } catch (error) {
        this.handleSpanError(span, span.dataset.ref || "unknown", error);
      }
    }

    /**
     * Processes a single span element using an HTML response.
     * Shows the loading icon, builds the fetch URL using encoding functions,
     * then either reuses a cached request or sends a new fetch request.
     * When the promise resolves, it updates the link accordingly.
     *
     * @param {HTMLElement} span - The span element to process.
     */
    processSpanHTML(span) {
      try {
        const { token, arg, user, env, ref } = span.dataset;
        const currentStatus = span.getAttribute("data-status") || "new";

        // Validate required data attributes
        if (!token || !arg || !user || !env) {
          throw new Error("Missing required data attributes on span element");
        }

        // Exclude rows based on configuration.
        if (this.useExclude && ref && ref.startsWith(this.excludeValue)) {
          span.setAttribute("data-status", "no document found");
          return;
        }

        // Only process spans that are "new".
        if (currentStatus !== "new" && this.showConsoleMessages == true) {
          console.log(ref, "already processed:", currentStatus);
          return;
        }

        this.showLoadingIcon(span);

        // Build the URL.
        const cleanArg = DocumentsOnline.url_Decode(arg).replace(/\\/g, "");
        const encodedArg = encodeURI(DocumentsOnline.fEncode(cleanArg));
        const baseUrl = this.isDevMode ? this.sDevUrl : this.sServerUrl;

        if (!baseUrl) {
          throw new Error("Server URL is not configured");
        }

        // Append the &html=true parameter.
        const fetchUrl = `${baseUrl}arg=${encodedArg}&env=${DocumentsOnline.url_Decode(
          env
        )}&user=${user}&token=${token}&html=true`;

        // Define a common response processor.
        const processResponse = (data) => {
          if (data === 1) {
            this.removeLoadingIcon(span);

            if (this.showConsoleMessages == true) {
              console.log(ref, " no document found");
            }
          } else {
            try {
              // Parse the returned HTML to extract the <a> element.
              const anchorEl = data.querySelector("a");
              if (!anchorEl) {
                throw new Error("No anchor element found in HTML response");
              }
              const destinationUrl = anchorEl.getAttribute("href");
              if (!destinationUrl) {
                throw new Error("Anchor element has no href attribute");
              }
              this.updatePaperclip(span, destinationUrl);
              if (this.showConsoleMessages == true) {
                console.log(ref, " document found:", destinationUrl);
              }
            } catch (error) {
              this.handleSpanError(span, ref, error);
            }
          }
        };

        // Check in-memory cache.
        if (this.requestCache.has(fetchUrl)) {
          this.requestCache
            .get(fetchUrl)
            .then(processResponse)
            .catch((error) => this.handleSpanError(span, ref, error));
          return;
        }

        // If not cached, fetch from the network.
        const promise = fetch(fetchUrl, {
          method: "GET",
          headers: { token: token, user: user },
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
            }
            return response.text();
          })
          .then((text) => {
            if (!text.trim()) return 1;

            try {
              const parsed = new window.DOMParser().parseFromString(text, "text/html");
              // Check for parser errors
              const parseError = parsed.querySelector("parsererror");
              if (parseError) {
                throw new Error("HTML parsing error: " + parseError.textContent);
              }
              return parsed;
            } catch (error) {
              throw new Error("Failed to parse HTML response: " + error.message);
            }
          });

        // Cache the promise.
        this.requestCache.set(fetchUrl, promise);

        promise.then(processResponse).catch((error) => this.handleSpanError(span, ref, error));
      } catch (error) {
        this.handleSpanError(span, span.dataset.ref || "unknown", error);
      }
    }

    /**
     * Sets up lazy loading for all spans with name="attachments".
     * An IntersectionObserver watches each span, and when it scrolls into view,
     * the appropriate processSpan function is called and the span is then unobserved.
     */
    setupLazyLoading() {
      try {
        const spans = document.querySelectorAll("span[name='attachments']");

        if (!spans || spans.length === 0) {
          console.warn("DocumentsOnline: No attachment spans found in document");
          return;
        }

        // Determine which processing function to use based on the configuration.
        // Default to processSpanXML if processSpanType is not set to "html".
        const processSpanFn =
          this.processSpanType && this.processSpanType.toLowerCase() === "html"
            ? this.processSpanHTML.bind(this)
            : this.processSpanXML.bind(this);
        // Check if eager loading is requested
        if (!this.useLazyLoading) {
          if (this.showConsoleMessages) {
            console.log("DocumentsOnline: Using eager loading mode");
          }

          // Process all spans immediately
          spans.forEach((span) => {
            try {
              processSpanFn(span);
            } catch (error) {
              this.handleSpanError(span, span.dataset.ref || "unknown", error);
            }
          });
          return;
        }

        // Otherwise continue with lazy loading
        if (this.showConsoleMessages) {
          console.log("DocumentsOnline: Using lazy loading mode");
        }

        if ("IntersectionObserver" in window) {
          const observerOptions = { threshold: 0.1 };
          const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                try {
                  processSpanFn(entry.target);
                } catch (error) {
                  this.handleSpanError(entry.target, entry.target.dataset.ref || "unknown", error);
                } finally {
                  observer.unobserve(entry.target);
                }
              }
            });
          }, observerOptions);

          spans.forEach((span) => {
            try {
              observer.observe(span);
            } catch (error) {
              console.error("Failed to observe span:", error);
              // Process the span directly if we can't observe it
              processSpanFn(span);
            }
          });
        } else {
          // Fallback for browsers without IntersectionObserver
          console.warn("DocumentsOnline: IntersectionObserver not supported, falling back to immediate loading");
          spans.forEach((span) => {
            try {
              processSpanFn(span);
            } catch (error) {
              this.handleSpanError(span, span.dataset.ref || "unknown", error);
            }
          });
        }
      } catch (error) {
        throw new scriptableReportError(
          "DocumentsOnline",
          "setupLazyLoading",
          "Failed to setup lazy loading: " + error.message
        );
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
            t = t + this._keyStr.charAt(s) + this._keyStr.charAt(o) + this._keyStr.charAt(u) + this._keyStr.charAt(a);
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
              t += String.fromCharCode(((r & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
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

    /**  SVG's are from Lucide Icons Library. https://lucide.dev/license
     * ISC License.
     * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT).
     * All other copyright (c) for Lucide are held by Lucide Contributors 2022.
     * Permission to use, copy, modify, and/or distribute this software for any purpose
     * with or without fee is hereby granted, provided that the above copyright notice and
     * this permission notice appear in all copies.
     * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD
     * TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS.
     * IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR
     * CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE,
     * DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS
     * ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
     **/
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

    /**
     * Returns an error icon SVG markup with the given width and height.
     *
     * @param {number|string} width - The desired width.
     * @param {number|string} height - The desired height.
     * @returns {string} The inline SVG markup.
     */
    static getErrorSVG(width, height) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    }
  }

  return DocumentsOnline;
});
