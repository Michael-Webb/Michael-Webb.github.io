define([], function () {
    "use strict";
  
    function DocumentsOnline() {}
    DocumentsOnline.prototype.initialize = function (
      oControlHost,
      fnDoneInitializing
    ) {
      const sServerUrl = oControlHost.configuration.ServerUrl,
        sPaperclipUrl = oControlHost.configuration.PaperclipUrl,
        sClockUrl = oControlHost.configuration.ClockUrl,
        cl_Font_h = oControlHost.configuration.Clock_Font_Height,
        cl_Font_l = oControlHost.configuration.Clock_Font_Length,
        pc_Font_h = oControlHost.configuration.Paperclip_Font_Height,
        pc_Font_l = oControlHost.configuration.Paperclip_Font_Length,
        sExclude_toggle = oControlHost.configuration.Use_Exclude,
        sExclude_value = oControlHost.configuration.Exclude_Value;
  
      function fEncode(vValue) {
        var Base64 = {
          _keyStr:
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
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
  
      function url_Decode(str) {
        return decodeURIComponent(str.replaceAll("+", " "));
      }
  
      function init_Timer(cLk, ndid, fnt1_h, fnt1_l) {
        let add_timer = document.createElement("img");
        let main_node = document.getElementById(ndid);
        add_timer.width = fnt1_h;
        add_timer.height = fnt1_l;
        add_timer.src = cLk;
        add_timer.id = ndid + "timer";
        let add_link = document.createElement("a");
        add_link.setAttribute("id", ndid + "link");
        main_node.setAttribute("data-status", "document loading");
        main_node.append(add_link);
        add_link.appendChild(add_timer);
        return;
      }
      function change_img(pID, pImg, link_xml, fnt2_h, fnt2_l) {
        let pclip_img = document.getElementById(pID + "timer");
        pclip_img.width = fnt2_l;
        pclip_img.height = fnt2_h;
        pclip_img.src = pImg;
        let img_hyperlink = document.getElementById(pID + "link");
        img_hyperlink.setAttribute("href", link_xml);
        img_hyperlink.setAttribute("target", "_blank");
        img_hyperlink.appendChild(pclip_img);
        return document.getElementById(pID).setAttribute("data-status", "document found"); 
      }
      function remove_image(img_id) {
        let remove_link = document.getElementById(img_id + "link");
        remove_link.setAttribute("href", "");
        let remove_img = document.getElementById(img_id + "timer");
        remove_img.parentNode.removeChild(remove_img);
        remove_link.parentNode.removeChild(remove_link);
        return document
          .getElementById(img_id)
          .setAttribute("data-status", "no document found");
      }
      function fetchDataFromSpanElements(
        pServerUrl,
        pPaperClip,
        pClock,
        pFont1_h,
        pFont1_l,
        pFont2_h,
        pFont2_l,
        pExclude_tog,
        pExclude_val
      ) {
        const spanElements = document.querySelectorAll(
          "span[name='attachments']"
        );
        const requests = [...spanElements].map((span) => {
          const baseUrl = pServerUrl,
            sToken = span.dataset.token,
            sArg = span.dataset.arg,
            sUsers = span.dataset.user,
            sEnv = span.dataset.env,
            sUniqueId = span.id,
            sReference = span.dataset.ref;
  
          let status = document.getElementById(sUniqueId);
          let get_status = status.getAttribute("data-status");
          if ((pExclude_tog && sReference.startsWith(pExclude_val)) === true) {
            status.setAttribute("data-status", "no document found");
            return;
          } else {
            if (get_status === "new") {
              init_Timer(pClock, sUniqueId, pFont1_h, pFont1_l);
              const fetchUrl =
                baseUrl +
                "arg=" +
                encodeURI(fEncode(url_Decode(sArg).replaceAll("\\", ""))) +
                "&env=" +
                url_Decode(sEnv);
              return fetch(fetchUrl, {
                method: "GET",
                headers: { token: sToken, user: sUsers },
              })
                .then((response) => {
                  let res = response.text();
                  return res;
                })
                .then((xmlstr) => {
                  if (xmlstr === " " || xmlstr === "") {
                    return 1;
                  } else {
                    return new window.DOMParser().parseFromString(
                      xmlstr,
                      "text/xml"
                    );
                  }
                })
                .then((data) => {
                  if (data === 1) {
                    remove_image(sUniqueId);
                    return console.log(sReference, " no document found");
                  } else {
                    let vXML =
                      data.getElementsByTagName("value")[0].childNodes[0]
                        .nodeValue;
                    change_img(sUniqueId, pPaperClip, vXML, pFont2_h, pFont2_l);
                    return console.log(sReference, " document found:", vXML);
                  }
                })
                .catch((error) => {
                  console.error(error);
                });
            } else if (status === "no document found") {
              return console.log(sReference, " no document found");
            } else if (
              status === "document found" ||
              status === "document loading"
            ) {
              return console.log(sReference, " document found");
            }
          }
        });
        return Promise.allSettled(requests);
      }
      fetchDataFromSpanElements(
        sServerUrl,
        sPaperclipUrl,
        sClockUrl,
        cl_Font_h,
        cl_Font_l,
        pc_Font_h,
        pc_Font_l,
        sExclude_toggle,
        sExclude_value
      );
      fnDoneInitializing();
    };
    return DocumentsOnline;
  });