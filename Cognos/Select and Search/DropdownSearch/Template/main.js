document.addEventListener("DOMContentLoaded", () => {
    const dropdown = document.querySelector(".dropdown-container")
    const header = dropdown.querySelector(".dropdown-header")
    const content = dropdown.querySelector(".dropdown-content")
    const search = dropdown.querySelector(".search-input")
    const advancedBtn = dropdown.querySelector(".advanced-search")
    const searchControls = dropdown.querySelector(".search-controls")
    const applyBtn = dropdown.querySelector(".apply-btn")
    const selectAll = dropdown.querySelector(".select-btn")
    const deselectAll = dropdown.querySelector(".deselect-btn")
    const compactCheckbox = document.querySelector(".compact-checkbox")
    const searchTypeSelect = dropdown.querySelector(".search-type")
  
    // Group controls
    const groups = dropdown.querySelectorAll(".group")
    groups.forEach((group) => {
      const selectBtn = group.querySelector(".group-select")
      const deselectBtn = group.querySelector(".group-deselect")
  
      selectBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        const checkboxes = group.querySelectorAll('input[type="checkbox"]')
        checkboxes.forEach((cb) => (cb.checked = true))
        updateSelectedCount()
        announceGroupSelection(group, true)
      })
  
      deselectBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        const checkboxes = group.querySelectorAll('input[type="checkbox"]')
        checkboxes.forEach((cb) => (cb.checked = false))
        updateSelectedCount()
        announceGroupSelection(group, false)
      })
    })
  
    // Event listeners
    header.addEventListener("click", () => {
      const isExpanded = content.style.display === "block"
      content.style.display = isExpanded ? "none" : "block"
      header.setAttribute("aria-expanded", !isExpanded)
      if (!isExpanded) {
        search.focus()
      }
    })
  
    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target)) {
        content.style.display = "none"
        header.setAttribute("aria-expanded", "false")
      }
    })
  
    advancedBtn.addEventListener("click", () => {
      const isExpanded = advancedBtn.classList.contains("expanded")
      advancedBtn.classList.toggle("expanded")
      searchControls.classList.toggle("expanded")
      advancedBtn.setAttribute("aria-expanded", !isExpanded)
    })
  
    // Keyboard navigation
    content.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        content.style.display = "none"
        header.setAttribute("aria-expanded", "false")
        header.focus()
      }
    })
  
    // Make checkboxes keyboard accessible
    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]')
    checkboxes.forEach((checkbox, index) => {
      checkbox.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown" && index < checkboxes.length - 1) {
          e.preventDefault()
          checkboxes[index + 1].focus()
        }
        if (e.key === "ArrowUp" && index > 0) {
          e.preventDefault()
          checkboxes[index - 1].focus()
        }
      })
    })
  
    searchTypeSelect.addEventListener("change", filterItems)
    selectAll.addEventListener("click", () => toggleAllItems(true))
    deselectAll.addEventListener("click", () => toggleAllItems(false))
    applyBtn.addEventListener("click", applySelection)
    dropdown.addEventListener("change", updateSelectedCount)
  
    compactCheckbox.addEventListener("change", (e) => {
      dropdown.classList.toggle("compact", e.target.checked)
    })
  
    // Debouncing Implementation
    let timeoutId
    const debounceDelay = 100 // milliseconds
  
    search.addEventListener("input", () => {
      clearTimeout(timeoutId) // Clear any previous timeout
      timeoutId = setTimeout(() => {
        // Set a new timeout
        filterItems() // Call filterItems after the delay
      }, debounceDelay)
    })
  
    function filterItems() {
      const searchType = dropdown.querySelector(".search-type").value
      const caseInsensitive = dropdown.querySelector(".case-checkbox").checked
      let searchValue = search.value
  
      if (caseInsensitive) {
        searchValue = searchValue.toLowerCase()
      }
  
      const searchTerms = searchValue.split(",").map((term) => term.trim())
  
      const items = dropdown.querySelectorAll(".checkbox-item")
      items.forEach((item) => {
        let text = item.textContent
        if (caseInsensitive) {
          text = text.toLowerCase()
        }
  
        const visible =
          searchType === "any"
            ? searchTerms.some((term) => text.includes(term))
            : searchTerms.every((term) => text.includes(term))
        item.style.display = visible || !search.value ? "flex" : "none"
      })
      updateGroupVisibility()
      announceSearchResults()
    }
  
    function toggleAllItems(checked) {
      const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]')
      checkboxes.forEach((cb) => (cb.checked = checked))
      updateSelectedCount()
      announceAllSelection(checked)
    }
  
    function applySelection() {
      const selectedValues = Array.from(
        dropdown.querySelectorAll('input[type="checkbox"]:checked'),
      ).map((cb) => cb.value)
      content.style.display = "none"
      header.setAttribute("aria-expanded", "false")
      console.log("Selected values:", selectedValues)
    }
  
    function updateGroupVisibility() {
      const groups = dropdown.querySelectorAll(".group")
      groups.forEach((group) => {
        const visibleItems = group.querySelectorAll(
          '.checkbox-item:not([style*="display: none"])',
        )
        group.style.display = visibleItems.length ? "block" : "none"
      })
    }
  
    function updateSelectedCount() {
      const count = dropdown.querySelectorAll(
        'input[type="checkbox"]:checked',
      ).length
      const selectedItems = Array.from(
        dropdown.querySelectorAll('input[type="checkbox"]:checked'),
      )
        .map((cb) => cb.closest(".checkbox-item").title)
        .join(", ")
      header.querySelector("span").textContent = count
        ? `${count} selected`
        : "Select Options"
      header.title = count ? selectedItems : "Select Options"
    }
  
    // Screen reader announcements
    function announceSearchResults() {
      const visibleCount = dropdown.querySelectorAll(
        '.checkbox-item:not([style*="display: none"])',
      ).length
      const liveRegion = document.getElementById("search-results-live")
      liveRegion.textContent = `${visibleCount} options found`
    }
  
    function announceGroupSelection(group, isSelected) {
      const groupName = group.querySelector(".group-header span").textContent
      const liveRegion = document.getElementById("search-results-live")
      liveRegion.textContent = `${groupName} ${isSelected ? "selected" : "cleared"}`
    }
  
    function announceAllSelection(isSelected) {
      const liveRegion = document.getElementById("search-results-live")
      liveRegion.textContent = `All options ${isSelected ? "selected" : "cleared"}`
    }
  })
  