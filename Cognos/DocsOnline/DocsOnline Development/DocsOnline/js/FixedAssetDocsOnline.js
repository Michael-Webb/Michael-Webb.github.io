const APP_BASE_URL = "https://cppfosapp.fdn.cpp.edu/";
const JOB_BASE_URL = "https://cppfosjob.fdn.cpp.edu/";

// Function to create and show a custom modal with document links
function showDocumentModal(documentData) {
  try {
    // Create modal overlay
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

    // Create modal content
    const modalContent = document.createElement("div");
    modalContent.style.backgroundColor = "white";
    modalContent.style.padding = "20px";
    modalContent.style.borderRadius = "5px";
    modalContent.style.width = "50%";
    modalContent.style.maxWidth = "600px";
    modalContent.style.maxHeight = "80%";
    modalContent.style.overflowY = "auto";
    modalContent.style.position = "relative";

    // Create header
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
    closeButton.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.body.removeChild(modalOverlay);
    };

    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);

    // Create modal body
    const modalBody = document.createElement("div");
    modalBody.style.marginTop = "10px";
    modalBody.style.marginBottom = "10px";

    // Intro paragraph
    const paragraphElement = document.createElement("p");
    paragraphElement.textContent = "The following documents are available:";
    modalBody.appendChild(paragraphElement);

    // Loop through document links
    documentData.forEach((doc, i) => {
      if (doc.url) {
        const linkParagraph = document.createElement("p");
        linkParagraph.style.margin = "5px 0";

        const linkElement = document.createElement("a");
        linkElement.href = doc.url;
        linkElement.textContent = `Document ${i + 1}: ${doc.description}`;
        linkElement.target = "_blank";

        linkParagraph.appendChild(linkElement);
        modalBody.appendChild(linkParagraph);
      }
    });

    // Create modal footer
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
    okButton.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.body.removeChild(modalOverlay);
    };

    modalFooter.appendChild(okButton);

    // Assemble modal
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);
    modalOverlay.appendChild(modalContent);

    // Prevent click propagation within modal content
    modalContent.onclick = (e) => e.stopPropagation();

    // Append modal and close if clicking outside it
    document.body.appendChild(modalOverlay);
    modalOverlay.onclick = (e) => {
      document.body.removeChild(modalOverlay);
    };
  } catch (error) {
    console.error("Error showing modal:", error);
    alert("There was an error showing the document modal.");
  }
}

// Updated function to find asset spans and include sessionID and token from the span attributes.
function findAssetSpans() {
  const spans = [];
  const allElements = document.querySelectorAll(`[id^="documentOnline-"]`);
  for (let i = 0; i < allElements.length; i++) {
    const span = allElements[i];
    const assetId = span.getAttribute("data-ref");
    const sessionID = span.getAttribute("data-sessionID");
    const token = span.getAttribute("data-token");
    if (assetId && sessionID && token) {
      spans.push({
        element: span,
        assetId: assetId,
        sessionID: sessionID,
        token: token,
      });
    }
  }
  console.log("Found " + spans.length + " asset spans");
  return spans;
}

// The fetchDocumentsForAsset function remains similar to your current implementation.
function fetchDocumentsForAsset(assetSpan, apiToken, appBaseURL, jobBaseURL) {
  const assetId = assetSpan.assetId;
  const element = assetSpan.element;

  // Create status indicator
  const statusIndicator = document.createElement("span");
  statusIndicator.textContent = "Fetching documents...";
  statusIndicator.style.fontSize = "12px";
  statusIndicator.style.color = "#666";
  statusIndicator.style.marginLeft = "5px";
  element.appendChild(statusIndicator);

  console.log("Fetching documents for asset ID: " + assetId);

  return fetch(
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
        priority: "u=1, i",
        runtimemask: "FAUPAS",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
      },
      body: JSON.stringify({ Faid: assetId }),
      mode: "cors",
      credentials: "include",
    }
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch documents: " + response.status);
      }
      return response.json();
    })
    .catch((error) => {
      console.log("Fetch failed, trying XMLHttpRequest for asset: " + assetId);
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
          "POST",
          `${jobBaseURL}Production-UI/api/finance/legacy/documents/FAIdnt/attachments/`,
          true
        );
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("glledger", "GL");
        xhr.setRequestHeader("jlledger", "--");
        xhr.setRequestHeader("mask", "FAUPAS");
        xhr.setRequestHeader("Authorization", "Bearer " + apiToken);
        xhr.withCredentials = true;

        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (e) {
              reject(new Error("Failed to parse document response"));
            }
          } else {
            reject(new Error("XHR request failed with status " + xhr.status));
          }
        };

        xhr.onerror = function () {
          reject(new Error("Network error during XHR request"));
        };

        xhr.send(JSON.stringify({ Faid: assetId }));
      });
    })
    .then((data) => {
      if (statusIndicator && statusIndicator.parentNode) {
        statusIndicator.parentNode.removeChild(statusIndicator);
      }

      if (data && data.length > 0) {
        console.log("Found " + data.length + " documents for asset ID: " + assetId);
        const button = document.createElement("button");
        button.textContent = "View Documents (" + data.length + ")";
        button.className = "btn btn-primary btn-sm";
        button.id = "btn-" + assetId;
        button.style.padding = "3px 8px";
        button.style.backgroundColor = "#337ab7";
        button.style.color = "white";
        button.style.border = "none";
        button.style.borderRadius = "3px";
        button.style.cursor = "pointer";
        button.style.fontSize = "12px";
        button.style.margin = "2px";
        button.setAttribute("data-documents", JSON.stringify(data));

        button.onclick = function (e) {
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

        element.appendChild(button);
      } else {
        console.log("No documents found for asset ID: " + assetId);
        const noDocsIndicator = document.createElement("span");
        noDocsIndicator.textContent = "No documents available";
        noDocsIndicator.style.fontSize = "12px";
        noDocsIndicator.style.color = "#999";
        noDocsIndicator.style.marginLeft = "5px";
        element.appendChild(noDocsIndicator);
      }

      return data;
    })
    .catch((error) => {
      console.error("Error fetching documents for asset " + assetId + ":", error);
      if (statusIndicator && statusIndicator.parentNode) {
        statusIndicator.parentNode.removeChild(statusIndicator);
      }
      const errorIndicator = document.createElement("span");
      errorIndicator.textContent = "Error: " + error.message;
      errorIndicator.style.fontSize = "12px";
      errorIndicator.style.color = "red";
      errorIndicator.style.marginLeft = "5px";
      element.appendChild(errorIndicator);
      return null;
    });
}

// Process a group of asset spans that share the same sessionID and token
function processAssetGroup(groupSpans, appBaseURL, jobBaseURL) {
  // Use the sessionID and token from the first span in this group
  const sessionID = groupSpans[0].sessionID;
  const token = groupSpans[0].token;
  console.log("Getting API token for group with sessionID:", sessionID);

  return fetch(
    `${jobBaseURL}Production/api/user/apiToken?sessionId=` +
      sessionID +
      "&authToken=" +
      token,
    {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/x-www-form-urlencoded",
      },
      referrer: appBaseURL,
      referrerPolicy: "strict-origin-when-cross-origin",
      method: "GET",
      mode: "cors",
      credentials: "omit",
    }
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error("API Token fetch failed: " + response.status);
      }
      return response.json();
    })
    .then((tokenData) => {
      if (!tokenData || !tokenData.apiToken) {
        throw new Error("No API token in response");
      }
      const apiToken = tokenData.apiToken;
      console.log("API Token obtained for group with sessionID:", sessionID);

      // Validate the token
      return fetch(
        `${JOB_BASE_URL}Production/api/User/ValidateSecurityToken`,
        {
          headers: {
            accept: "*/*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/x-www-form-urlencoded",
            Authorization: "Bearer " + apiToken,
          },
          referrer: APP_BASE_URL,
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
        }
      ).then((validateResponse) => {
        if (!validateResponse.ok) {
          throw new Error(
            "Token validation failed: " + validateResponse.status
          );
        }
        console.log("Token validated for group with sessionID:", sessionID);

        // Process each asset in this group sequentially
        let promiseChain = Promise.resolve();
        groupSpans.forEach((assetSpan) => {
          promiseChain = promiseChain.then(() =>
            fetchDocumentsForAsset(assetSpan, apiToken, appBaseURL, jobBaseURL)
          );
        });
        return promiseChain;
      });
    })
    .catch((error) => {
      console.error("Error processing asset group with sessionID:", sessionID, error);
      // Optionally mark error on each asset in this group
      groupSpans.forEach((assetSpan) => {
        const errorIndicator = document.createElement("span");
        errorIndicator.textContent = "Auth Error: " + error.message;
        errorIndicator.style.fontSize = "12px";
        errorIndicator.style.color = "red";
        errorIndicator.style.marginLeft = "5px";
        assetSpan.element.appendChild(errorIndicator);
      });
    });
}

// Main function to process all assets.
// This function groups spans by their sessionID/token pair and then processes each group.
function processAllAssets(appBaseURL, jobBaseURL) {
  const assetSpans = findAssetSpans();
  if (assetSpans.length === 0) {
    console.log("No asset spans found, nothing to process");
    return;
  }

  // Group spans by sessionID and token
  const groups = {};
  assetSpans.forEach((span) => {
    const key = span.sessionID + "|" + span.token;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(span);
  });

  // Process each group sequentially
  let promiseChain = Promise.resolve();
  Object.keys(groups).forEach((key) => {
    const groupSpans = groups[key];
    promiseChain = promiseChain.then(() =>
      processAssetGroup(groupSpans, appBaseURL, jobBaseURL)
    );
  });
}

// Since module scripts are deferred by default, simply include this file in your HTML:
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    processAllAssets(APP_BASE_URL, JOB_BASE_URL);
  });
} else {
  processAllAssets(APP_BASE_URL, JOB_BASE_URL);
}
