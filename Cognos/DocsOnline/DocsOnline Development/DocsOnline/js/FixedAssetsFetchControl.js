(async function() {
  // Grab sessionID, token, appURL, and jobURL from the first span with an id starting with "documentOnline-"
  let sessionID = "";
  let token = "";
  let appBaseURL = "https://cppfosapp.fdn.cpp.edu/";
  let jobBaseURL = "https://cppfosjob.fdn.cpp.edu/";

  const firstSpan = document.querySelector(`span[id^="documentOnline-"]`);
  if (firstSpan) {
    sessionID = firstSpan.getAttribute("data-sessionId") || "";
    token = firstSpan.getAttribute("data-token") || "";
    // Extract and decode app and job URLs if they exist
    const appURLFromSpan = firstSpan.getAttribute("data-appURL");
    const jobURLFromSpan = firstSpan.getAttribute("data-jobURL");
    if (appURLFromSpan) {
      appBaseURL = decodeURIComponent(appURLFromSpan);
    }
    if (jobURLFromSpan) {
      jobBaseURL = decodeURIComponent(jobURLFromSpan);
    }
    console.log("Extracted values:", { sessionID, token, appBaseURL, jobBaseURL });
  } else {
    console.error("No span found with id starting with documentOnline- to extract sessionID, token, and URLs.");
  }

  // Define icon dimensions and paperclip SVG
  const ICON_WIDTH = "24";
  const ICON_HEIGHT = "24";
  const paperclipSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_WIDTH}" height="${ICON_HEIGHT}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-paperclip"><path d="M13.234 20.252 21 12.3"/><path d="m16 6-8.414 8.586a2 2 0 0 0 0 2.828 2 2 0 0 0 2.828 0l8.414-8.586a4 4 0 0 0 0-5.656 4 4 0 0 0-5.656 0l-8.415 8.585a6 6 0 1 0 8.486 8.486"/></svg>`;

  // Function to create and show a custom modal with document links
  function showDocumentModal(documentData) {
    try {
      const modalOverlay = document.createElement("div");
      modalOverlay.style.position = "fixed";
      modalOverlay.style.top = "0";
      modalOverlay.style.left = "0";
      modalOverlay.style.width = "100%";
      modalOverlay.style.height = "100%";
      modalOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      modalOverlay.style.display = "flex";
      modalOverlay.style.justifyContent = "center";
      modalOverlay.style.alignItems = "center";
      modalOverlay.style.zIndex = "9999";

      const modalContent = document.createElement("div");
      modalContent.style.backgroundColor = "white";
      modalContent.style.padding = "20px";
      modalContent.style.borderRadius = "5px";
      modalContent.style.width = "50%";
      modalContent.style.maxWidth = "600px";
      modalContent.style.maxHeight = "80%";
      modalContent.style.overflowY = "auto";
      modalContent.style.position = "relative";

      const modalHeader = document.createElement("div");
      modalHeader.style.display = "flex";
      modalHeader.style.justifyContent = "space-between";
      modalHeader.style.alignItems = "center";
      modalHeader.style.marginBottom = "15px";

      const modalTitle = document.createElement("h3");
      modalTitle.textContent = "Document Links";
      modalTitle.style.margin = "0";

      const closeButton = document.createElement("button");
      closeButton.textContent = "×";
      closeButton.style.background = "none";
      closeButton.style.border = "none";
      closeButton.style.fontSize = "24px";
      closeButton.style.cursor = "pointer";
      closeButton.style.padding = "0 5px";
      closeButton.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        document.body.removeChild(modalOverlay);
      };

      modalHeader.appendChild(modalTitle);
      modalHeader.appendChild(closeButton);

      const modalBody = document.createElement("div");
      modalBody.style.marginTop = "10px";
      modalBody.style.marginBottom = "10px";

      const paragraphElement = document.createElement("p");
      paragraphElement.textContent = "The following documents are available:";
      modalBody.appendChild(paragraphElement);

      documentData.forEach((doc, index) => {
        if (doc.url) {
          const linkParagraph = document.createElement("p");
          linkParagraph.style.margin = "5px 0";

          const linkElement = document.createElement("a");
          linkElement.href = doc.url;
          linkElement.textContent = "Document " + (index + 1) + ": " + doc.description;
          linkElement.target = "_blank";

          linkParagraph.appendChild(linkElement);
          modalBody.appendChild(linkParagraph);
        }
      });

      const modalFooter = document.createElement("div");
      modalFooter.style.marginTop = "20px";
      modalFooter.style.textAlign = "right";

      const okButton = document.createElement("button");
      okButton.textContent = "OK";
      okButton.style.padding = "5px 10px";
      okButton.style.backgroundColor = "#4CAF50";
      okButton.style.color = "white";
      okButton.style.border = "none";
      okButton.style.borderRadius = "3px";
      okButton.style.cursor = "pointer";
      okButton.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        document.body.removeChild(modalOverlay);
      };

      modalFooter.appendChild(okButton);

      modalContent.appendChild(modalHeader);
      modalContent.appendChild(modalBody);
      modalContent.appendChild(modalFooter);
      modalOverlay.appendChild(modalContent);

      modalContent.onclick = function(e) {
        e.stopPropagation();
      };

      document.body.appendChild(modalOverlay);

      modalOverlay.onclick = function(e) {
        document.body.removeChild(modalOverlay);
      };
    } catch (error) {
      console.error("Error showing modal:", error);
      alert("There was an error showing the document modal.");
    }
  }

  // --- Sequential Fetch Calls ---

  // 1. Fetch the FAUPAS screen to capture cookies
  try {
    const faupasResponse = await fetch(appBaseURL + "Production-UI/ui/uiscreens/fixedassets/FAUPAS", {
      headers: {
        priority: "u=0, i",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-site",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
      },
      referrer: jobBaseURL,
      referrerPolicy: "strict-origin-when-cross-origin",
      body: null,
      method: "GET",
      mode: "no-cors",
      credentials: "include",
    });
    console.log("FAUPAS fetch complete:", faupasResponse);
  } catch (error) {
    console.error("Error during FAUPAS fetch:", error);
  }

  // 2. Fetch API token and validate token
  try {
    const tokenResponse = await fetch(
      `${jobBaseURL}Production/api/user/apiToken?sessionId=${sessionID}&authToken=${token}`,
      {
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/x-www-form-urlencoded",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "no-cors",
          "sec-fetch-site": "same-site",
        },
        referer: appBaseURL,
        referrerPolicy: "strict-origin-when-cross-origin",
        body: null,
        method: "GET",
        mode: "cors",
        credentials: "omit",
        "access-control-allow-origin:": "*",
      }
    );
    if (!tokenResponse.ok) {
      throw new Error("API Token fetch failed: " + tokenResponse.status);
    }
    const tokenData = await tokenResponse.json();
    if (!tokenData || !tokenData.apiToken) {
      throw new Error("No API token in response");
    }
    const apiToken = tokenData.apiToken;
    console.log("API Token obtained:", apiToken);

    const validationResponse = await fetch(`${jobBaseURL}Production/api/User/ValidateSecurityToken`, {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/x-www-form-urlencoded",
        Authorization: "Bearer " + apiToken,
      },
      referrer: appBaseURL,
      referrerPolicy: "strict-origin-when-cross-origin",
      body:
        "sessionId=" +
        sessionID +
        "&authToken=" +
        token +
        "&claims=NameIdentifier&claims=Name&claims=GivenName&claims=Surname",
      method: "POST",
      mode: "cors",
      credentials: "omit",
    });
    if (!validationResponse.ok) {
      throw new Error("Token validation failed: " + validationResponse.status);
    }
    console.log("Token validated for sessionID:", sessionID);
  } catch (error) {
    console.error("Error fetching API token or validating token:", error);
  }

  // 3. Process spans for attachments only after authentication is complete
  const spans = document.querySelectorAll(`span[id^="documentOnline-"]`);
  spans.forEach(span => {
    const assetID = span.getAttribute("data-ref");
    console.log("Processing asset ID:", assetID);

    fetch(
      `${appBaseURL}Production-UI/api/finance/legacy/documents/FAIdnt/attachments/`,
      {
        method: "POST",
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/json",
          glledger: "GL",
          jlledger: "--",
          mask: "FAUPAS",
          runtimemask: "FAUPAS",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
        },
        body: JSON.stringify({ Faid: assetID }),
        mode: "cors",
        credentials: "include",
        "Access-Control-Allow-Credentials": "*",
      }
    )
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch attachment for asset ID ${assetID}: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log(`Attachment data for asset ID ${assetID}:`, data);
        if (data && data.length > 0) {
          console.log("Found", data.length, "documents for asset ID:", assetID);

          let container = document.getElementById(assetID);
          if (!container) {
            container = document.createElement("span");
            container.id = assetID;
            span.parentNode.insertBefore(container, span.nextSibling);
          } else {
            container.innerHTML = "";
          }

          const button = document.createElement("button");
          button.innerHTML = paperclipSVG;
          button.style.border = "none";
          button.style.background = "none";
          button.style.cursor = "pointer";
          button.style.padding = "0";
          button.style.margin = "2px";

          button.setAttribute("data-documents", JSON.stringify(data));

          button.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            try {
              const btnDocuments = JSON.parse(this.getAttribute("data-documents"));
              showDocumentModal(btnDocuments);
            } catch (error) {
              console.error("Error showing modal:", error);
              alert("There was an error displaying the documents.");
            }
            return false;
          };

          container.appendChild(button);
          console.log("Button added for asset ID:", assetID);
        } else {
          console.log("No documents found for asset ID:", assetID);
        }
      })
      .catch(error => {
        console.error("Error fetching attachment for asset ID", assetID, error);
      });
  });
})();
