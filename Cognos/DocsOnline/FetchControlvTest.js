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
        // Although we no longer use these URLs (SVGs are inline), we still read the config.
        this.sServerUrl           = config.ServerUrl;
        this.clockFontHeight      = config.Clock_Font_Height;
        this.clockFontLength      = config.Clock_Font_Length;
        this.paperclipFontHeight  = config.Paperclip_Font_Height;
        this.paperclipFontLength  = config.Paperclip_Font_Length;
        this.useExclude           = config.Use_Exclude;
        this.excludeValue         = config.Exclude_Value;
        fnDoneInitializing();
      }
  
      /**
       * Called by Cognos when the control should render itself.
       * It processes each span with name="attachments" to draw the loading icon
       * and then later replace it with a paperclip icon (or remove it if no document is found).
       *
       * @param {object} oControlHost - The Cognos control host.
       */
      draw(oControlHost) {
        this.fetchAttachmentData();
      }
  
      /**
       * Inserts a loading icon (clock SVG) wrapped in an anchor element into the container.
       *
       * @param {string} elementId - The target element's ID.
       */
      showLoadingIcon(elementId) {
        const container = document.getElementById(elementId);
        if (!container) return;
        const link = document.createElement("a");
        link.id = `${elementId}link`;
        // Insert the inline clock SVG.
        link.innerHTML = DocumentsOnline.CLOCK_SVG;
        container.setAttribute("data-status", "document loading");
        container.appendChild(link);
      }
  
      /**
       * Replaces the loading icon with a paperclip icon and sets the hyperlink's destination.
       *
       * @param {string} elementId - The target element's ID.
       * @param {string} destinationUrl - The URL parsed from the XML response.
       */
      updatePaperclip(elementId, destinationUrl) {
        const link = document.getElementById(`${elementId}link`);
        if (link) {
          link.href = destinationUrl;
          link.target = "_blank";
          // Replace the clock SVG with the paperclip SVG.
          link.innerHTML = DocumentsOnline.PAPERCLIP_SVG;
        }
        const container = document.getElementById(elementId);
        if (container) {
          container.setAttribute("data-status", "document found");
        }
      }
  
      /**
       * Removes the loading icon if no document was found.
       *
       * @param {string} elementId - The target element's ID.
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
       * Loops through all spans with name="attachments" and, for each that is new,
       * displays the loading icon and fetches the document data asynchronously.
       */
      fetchAttachmentData() {
        const spans = document.querySelectorAll("span[name='attachments']");
        const requests = Array.from(spans).map((span) => {
          const { token, arg, user, env, ref } = span.dataset;
          const elementId = span.id;
          const container = document.getElementById(elementId);
          const currentStatus = container ? container.getAttribute("data-status") : "new";
  
          // Exclude rows based on configuration.
          if (this.useExclude && ref.startsWith(this.excludeValue)) {
            if (container) {
              container.setAttribute("data-status", "no document found");
            }
            return Promise.resolve();
          }
  
          // Process only spans that have not yet been handled.
          if (currentStatus !== "new") {
            console.log(ref, "already processed:", currentStatus);
            return Promise.resolve();
          }
  
          // Display the loading icon.
          this.showLoadingIcon(elementId);
  
          // Build the URL using the provided encoding functions.
          const cleanArg = DocumentsOnline.url_Decode(arg).replaceAll("\\", "");
          const encodedArg = encodeURI(DocumentsOnline.fEncode(cleanArg));
          const fetchUrl = `${this.sServerUrl}arg=${encodedArg}&env=${DocumentsOnline.url_Decode(env)}`;
  
          return fetch(fetchUrl, {
            method: "GET",
            headers: { token: token, user: user },
          })
            .then((response) => response.text())
            .then((text) => {
              // If response is empty (or whitespace), signal no document found.
              if (!text.trim()) {
                return 1;
              }
              return new window.DOMParser().parseFromString(text, "text/xml");
            })
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
        });
        return Promise.allSettled(requests);
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
    }
  
    // Inline SVG definitions (using the provided SVG markup).
    DocumentsOnline.CLOCK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
  
    DocumentsOnline.PAPERCLIP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-paperclip"><path d="M13.234 20.252 21 12.3"/><path d="m16 6-8.414 8.586a2 2 0 0 0 0 2.828 2 2 0 0 0 2.828 0l8.414-8.586a4 4 0 0 0 0-5.656 4 4 0 0 0-5.656 0l-8.415 8.585a6 6 0 1 0 8.486 8.486"/></svg>`;
  
    return DocumentsOnline;
  });
  