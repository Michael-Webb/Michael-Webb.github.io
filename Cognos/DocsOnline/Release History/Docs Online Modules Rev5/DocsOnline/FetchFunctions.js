function urldec(str) {
  return decodeURIComponent(str.replaceAll("+", " "));
}

//Central square fEncode() script
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
function checkForAttachment() {
  //this is URLDecode all the data item strings from the HTML Item Span

  let nL = [...document.querySelectorAll('span[name="attachments"]')];

  console.log("NodeList: ", nL);

  //For each element in the nL array do a fetch against url and then do something
  nL.forEach((node) => {
    try {
      let check_d = document.getElementById(
        `${this.urldec(node.dataset.unid)}` + "-done"
      );
      //console.log('d',check_d)
      let check_h = document.getElementById(
        `${this.urldec(node.dataset.unid)}` + "-link"
      );
      if (check_d !== null) {
        return;
      } else if (check_h !== null) {
        return;
      }
    } catch {
      //console.log('Beginning Catch')
    }
    try {
      let check_img = document.getElementById(
        `${this.urldec(node.dataset.unid)}` + "-link"
      );
      check_href = check_img.getAttribute("href") === "";
      //console.log(check_href);
      return;
    } catch {
      // If no img is in the span then add the clock image to the element with a unique ID and add a hyperlink with src="" within it
      let add_timer = document.createElement("img");
      //If you choose to change the icon for loading to a different dimension this is where you can change the length and width through multiplying the 'node.dataset.font' by the value you want one dimension changed by
      add_timer.width = node.dataset.font;
      add_timer.height = node.dataset.font;
      add_timer.src = `${this.urldec(node.dataset.clock)}`;
      add_timer.id = `${this.urldec(node.dataset.unid)}`;
      //console.log('ids', `${node.dataset.unid}`)
      let add_link = document.createElement("a");
      add_link.setAttribute("href", "");
      add_link.setAttribute("target", "_blank");
      add_link.setAttribute(
        "id",
        `${this.urldec(node.dataset.unid)}` + "-link"
      );
      node.appendChild(add_link);
      add_link.appendChild(add_timer);

      //Execute a fetch request per node iterated on. Fetch(ServerUrl + arguments + environment) headers: token, user
      fetch(
        `${
          this.urldec(node.dataset.server) +
          encodeURI(
            this.fEncode(this.urldec(node.dataset.arg).replaceAll("\\", ""))
          ) +
          `${this.urldec(node.dataset.env)}`
        }`,
        {
          method: "GET",
          headers: {
            token: `${node.dataset.token}`,
            user: `${this.urldec(node.dataset.user)}`,
          },
        }
      )
        .then((response) => {
          let res = response.text();
          //console.log(res)
          return res;
        })
        .then((xmlstr) =>
          new window.DOMParser().parseFromString(xmlstr, "text/xml")
        )
        .then((data) => {
          /*if the Docs Online service returns " " or "" that means no document exists or the string was encoded incorrectly
        If an XML string is passed it will apply the URL in the "value" node to the 'src' of the hyperlink with a unique ID
        */
          if (data != " ") {
            let vXML =
              data.getElementsByTagName("value")[0].childNodes[0].nodeValue;
            //console.log('Fetch Response',vXML);
            let change_img = document.getElementById(
              `${this.urldec(node.dataset.unid)}`
            );
            //If you want to use an icon other than the included paperclip this is where you can change the font width.
            change_img.width = node.dataset.font / 2;
            change_img.height = node.dataset.font;
            change_img.src = `${this.urldec(node.dataset.paperclip)}`;
            let add_link2 = document.getElementById(
              `${this.urldec(node.dataset.unid)}` + "-link"
            );
            add_link2.setAttribute("href", vXML);
            add_link2.setAttribute("target", "_blank");
            node.appendChild(add_link2);
            add_link2.appendChild(change_img);
          }
        })
        .catch((error) => {
          //console.log('No Document Found: ',`${this.urldec(node.dataset.unid)}`)
          let dd = document.getElementById(
            `${this.urldec(node.dataset.unid)}` + "-link"
          );
          let ee = document.getElementById(
            `${this.urldec(node.dataset.unid)}`
          );
          dd.setAttribute("href", "");
          dd.removeChild(ee);
          dd.setAttribute(
            "id",
            `${this.urldec(node.dataset.unid)}` + "-done"
          );
        })
        .finally((end) => {
          //console.log('finished')
        });
      return;
    }
});
};