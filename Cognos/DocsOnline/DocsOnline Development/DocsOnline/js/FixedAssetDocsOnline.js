
const APP_BASE_URL = "https://cppfosapp.fdn.cpp.edu/"
const JOB_BASE_URL = "https://cppfosjob.fdn.cpp.edu/"


// Function to create and show a custom modal with document links
function showDocumentModal(documentData) {
  try {
    // Create modal overlay
    var modalOverlay = document.createElement("div");
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
    var modalContent = document.createElement("div");
    modalContent.style.backgroundColor = "white";
    modalContent.style.padding = "20px";
    modalContent.style.borderRadius = "5px";
    modalContent.style.width = "50%";
    modalContent.style.maxWidth = "600px";
    modalContent.style.maxHeight = "80%";
    modalContent.style.overflowY = "auto";
    modalContent.style.position = "relative";

    // Create modal header
    var modalHeader = document.createElement("div");
    modalHeader.style.display = "flex";
    modalHeader.style.justifyContent = "space-between";
    modalHeader.style.alignItems = "center";
    modalHeader.style.marginBottom = "15px";

    var modalTitle = document.createElement("h3");
    modalTitle.textContent = "Document Links";
    modalTitle.style.margin = "0";

    var closeButton = document.createElement("button");
    closeButton.textContent = "×";
    closeButton.style.background = "none";
    closeButton.style.border = "none";
    closeButton.style.fontSize = "24px";
    closeButton.style.cursor = "pointer";
    closeButton.style.padding = "0 5px";
    closeButton.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      document.body.removeChild(modalOverlay);
    };

    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);

    // Create modal body
    var modalBody = document.createElement("div");
    modalBody.style.marginTop = "10px";
    modalBody.style.marginBottom = "10px";

    // Add document links
    var paragraphElement = document.createElement("p");
    paragraphElement.textContent = "The following documents are available:";
    modalBody.appendChild(paragraphElement);

    // Create links as separate elements instead of HTML string
    for (var i = 0; i < documentData.length; i++) {
      if (documentData[i].url) {
        var linkParagraph = document.createElement("p");
        linkParagraph.style.margin = "5px 0";

        var linkElement = document.createElement("a");
        linkElement.href = documentData[i].url;
        linkElement.textContent =
          "Document " + (i + 1) + ": " + documentData[i].description;
        linkElement.target = "_blank";

        linkParagraph.appendChild(linkElement);
        modalBody.appendChild(linkParagraph);
      }
    }

    // Create modal footer
    var modalFooter = document.createElement("div");
    modalFooter.style.marginTop = "20px";
    modalFooter.style.textAlign = "right";

    var okButton = document.createElement("button");
    okButton.textContent = "OK";
    okButton.style.padding = "5px 10px";
    okButton.style.backgroundColor = "#4CAF50";
    okButton.style.color = "white";
    okButton.style.border = "none";
    okButton.style.borderRadius = "3px";
    okButton.style.cursor = "pointer";
    okButton.onclick = function (e) {
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

    // Prevent event propagation within modal content
    modalContent.onclick = function (e) {
      e.stopPropagation();
    };

    // Add modal to page
    document.body.appendChild(modalOverlay);

    // Close when clicking outside the modal
    modalOverlay.onclick = function (e) {
      document.body.removeChild(modalOverlay);
    };
  } catch (error) {
    console.error("Error showing modal:", error);
    alert("There was an error showing the document modal.");
  }
}

// Debug info
console.log("Script starting for document detection");

// Add custom contains selector for jQuery-like functionality
if (!Element.prototype.matches) {
  Element.prototype.matches =
    Element.prototype.msMatchesSelector ||
    Element.prototype.webkitMatchesSelector;
}

if (typeof document.querySelector !== "undefined") {
  // Add contains selector
  document.querySelectorAll = (function (nativeQSA) {
    return function (selector) {
      if (selector && selector.indexOf && selector.indexOf(":contains") > -1) {
        var parts = selector.split(":contains(");
        var pre = parts[0];
        var post = parts[1].slice(0, -1);
        var elements = document.querySelectorAll(pre || "*");
        var results = [];

        for (var i = 0; i < elements.length; i++) {
          if (elements[i].textContent.indexOf(post) > -1) {
            results.push(elements[i]);
          }
        }

        return results;
      }
      return nativeQSA.call(document, selector);
    };
  })(document.querySelectorAll);
}

// Function to find all asset spans
function findAssetSpans() {
  var spans = [];
  var allElements = document.querySelectorAll(`[id^="documentOnline-"]`);

  for (var i = 0; i < allElements.length; i++) {
    var span = allElements[i];
    var assetId = span.getAttribute("data-ref");

    if (assetId) {
      spans.push({
        element: span,
        assetId: assetId,
      });
    }
  }

  console.log("Found " + spans.length + " asset spans");
  return spans;
}

// Function to fetch documents for a specific asset
function fetchDocumentsForAsset(assetSpan, apiToken,appBaseURL,jobBaseURL) {
  var assetId = assetSpan.assetId;
  var element = assetSpan.element;

  // Create status indicator
  var statusIndicator = document.createElement("span");
  statusIndicator.textContent = "Fetching documents...";
  statusIndicator.style.fontSize = "12px";
  statusIndicator.style.color = "#666";
  statusIndicator.style.marginLeft = "5px";
  element.appendChild(statusIndicator);

  console.log("Fetching documents for asset ID: " + assetId);

  // Try various approaches to fetch documents
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
      body: JSON.stringify({
        Faid: assetId,
      }),
      mode: "cors",
      credentials: "include",
    }
  )
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Failed to fetch documents: " + response.status);
      }
      return response.json();
    })
    .catch(function (error) {
      // Try XMLHttpRequest as fallback
      console.log("Fetch failed, trying XMLHttpRequest for asset: " + assetId);

      return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
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
              var data = JSON.parse(xhr.responseText);
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
    .then(function (data) {
      // Remove status indicator
      if (statusIndicator && statusIndicator.parentNode) {
        statusIndicator.parentNode.removeChild(statusIndicator);
      }

      // Process the documents data
      if (data && data.length > 0) {
        console.log(
          "Found " + data.length + " documents for asset ID: " + assetId
        );

        // Create a button
        var button = document.createElement("button");
        button.textContent = "View Documents (" + data.length + ")";
        button.className = "btn btn-primary btn-sm";
        button.id = "btn-" + assetId;

        // Add inline styles
        button.style.padding = "3px 8px";
        button.style.backgroundColor = "#337ab7";
        button.style.color = "white";
        button.style.border = "none";
        button.style.borderRadius = "3px";
        button.style.cursor = "pointer";
        button.style.fontSize = "12px";
        button.style.margin = "2px";

        // Save document data
        button.setAttribute("data-documents", JSON.stringify(data));

        // Add click event
        button.onclick = function (e) {
          e.preventDefault();
          e.stopPropagation();
          try {
            var btnDocuments = JSON.parse(this.getAttribute("data-documents"));
            showDocumentModal(btnDocuments);
          } catch (error) {
            console.error("Error showing modal:", error);
            alert("There was an error displaying the documents.");
          }
          return false;
        };

        // Add button to the asset span
        element.appendChild(button);
      } else {
        console.log("No documents found for asset ID: " + assetId);

        // Show "No documents" indicator
        var noDocsIndicator = document.createElement("span");
        noDocsIndicator.textContent = "No documents available";
        noDocsIndicator.style.fontSize = "12px";
        noDocsIndicator.style.color = "#999";
        noDocsIndicator.style.marginLeft = "5px";
        element.appendChild(noDocsIndicator);
      }

      return data;
    })
    .catch(function (error) {
      console.error(
        "Error fetching documents for asset " + assetId + ":",
        error
      );

      // Remove status indicator
      if (statusIndicator && statusIndicator.parentNode) {
        statusIndicator.parentNode.removeChild(statusIndicator);
      }

      // Show error indicator
      var errorIndicator = document.createElement("span");
      errorIndicator.textContent = "Error: " + error.message;
      errorIndicator.style.fontSize = "12px";
      errorIndicator.style.color = "red";
      errorIndicator.style.marginLeft = "5px";
      element.appendChild(errorIndicator);

      return null;
    });
}

// Main function to process all assets
function processAllAssets(appBaseURL,jobBaseURL) {
  // Find all asset spans
  var assetSpans = findAssetSpans();

  if (assetSpans.length === 0) {
    console.log("No asset spans found, nothing to process");
    return;
  }

  console.log("Starting authentication for " + assetSpans.length + " assets");

  // Prepare authentication parameters
  var sessionID = "'+[SessionId]+'";
  var token = "'+[Token]+'";
  sessionID = encodeURIComponent(sessionID);
  token = encodeURIComponent(token);

  // Step 1: Get API Token
  console.log("Getting API token...");

  fetch(
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
      body: null,
      method: "GET",
      mode: "cors",
      credentials: "omit",
    }
  )
    .then(function (response) {
      if (!response.ok) {
        throw new Error("API Token fetch failed: " + response.status);
      }
      return response.json();
    })
    .then(function (tokenData) {
      if (!tokenData || !tokenData.apiToken) {
        throw new Error("No API token in response");
      }

      var apiToken = tokenData.apiToken;
      console.log("API Token obtained successfully");

      // Step 2: Validate the token
      return fetch(
        "https://cppfosjob.fdn.cpp.edu/Production/api/User/ValidateSecurityToken",
        {
          headers: {
            accept: "*/*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/x-www-form-urlencoded",
            Authorization: "Bearer " + apiToken,
          },
          referrer: "https://cppfosapp.fdn.cpp.edu/",
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
      ).then(function (validateResponse) {
        if (!validateResponse.ok) {
          throw new Error(
            "Token validation failed: " + validateResponse.status
          );
        }

        console.log(
          "Token validated successfully, processing " +
            assetSpans.length +
            " assets"
        );

        // Step 3: Process each asset in sequence
        var promiseChain = Promise.resolve();

        assetSpans.forEach(function (assetSpan) {
          promiseChain = promiseChain.then(function () {
            return fetchDocumentsForAsset(assetSpan, apiToken,appBaseURL,jobBaseURL);
          });
        });

        return promiseChain;
      });
    })
    .catch(function (error) {
      console.error("Authentication error:", error);

      // Show error for all asset spans
      assetSpans.forEach(function (assetSpan) {
        var errorIndicator = document.createElement("span");
        errorIndicator.textContent = "Auth Error: " + error.message;
        errorIndicator.style.fontSize = "12px";
        errorIndicator.style.color = "red";
        errorIndicator.style.marginLeft = "5px";
        assetSpan.element.appendChild(errorIndicator);
      });
    });
}

// Start processing when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", processAllAssets(APP_BASE_URL, JOB_BASE_URL));
} else {
  processAllAssets(APP_BASE_URL, JOB_BASE_URL);
}
