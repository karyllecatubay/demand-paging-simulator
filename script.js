// DOM Elements
const frontPage = document.getElementById("frontPage")
const mainPage = document.getElementById("mainPage")
const algorithmPage = document.getElementById("algorithmPage")
const getStartedBtn = document.getElementById("getStartedBtn")
const goToSimulatorBtn = document.getElementById("goToSimulatorBtn")
const refStringInput = document.getElementById("refString")
const numFramesInput = document.getElementById("numFrames")
const algorithmSelect = document.getElementById("algorithm")
const runBtn = document.getElementById("runBtn")
const stopBtn = document.getElementById("stopBtn")
const continueBtn = document.getElementById("continueBtn")
const resetBtn = document.getElementById("resetBtn")
const editBtn = document.getElementById("editBtn")
const learnMoreBtn = document.getElementById("learnMoreBtn")
const statusBar = document.getElementById("statusBar")
const pageFaultsCounter = document.getElementById("pageFaults")
const pageHitsCounter = document.getElementById("pageHits")
const currentRefCounter = document.getElementById("currentRef")
const framesContainer = document.getElementById("framesContainer")
const clickSound = document.getElementById("clickSound")
const stepSound = document.getElementById("stepSound")
const hitSound = document.getElementById("hitSound")
const faultSound = document.getElementById("faultSound")

// Simulation Variables
let referenceString = []
let frames = []
let numFrames = 3
let algorithm = "FIFO"
let pageFaults = 0
let pageHits = 0
let currentStep = -1
let simulationInterval
let simulationRunning = false
let fifoQueue = []
let lruStack = []
let lfuCounts = {}

// Sound Management Variables
const currentSounds = {
  getStarted: null,
  step: null,
  hit: null,
  fault: null,
}

// Error handling - Check if all required DOM elements exist
function checkDOMElements() {
  const requiredElements = [
    { element: frontPage, name: "frontPage" },
    { element: mainPage, name: "mainPage" },
    { element: algorithmPage, name: "algorithmPage" },
    { element: getStartedBtn, name: "getStartedBtn" },
    { element: goToSimulatorBtn, name: "goToSimulatorBtn" },
    { element: refStringInput, name: "refString" },
    { element: numFramesInput, name: "numFrames" },
    { element: algorithmSelect, name: "algorithm" },
    { element: runBtn, name: "runBtn" },
    { element: stopBtn, name: "stopBtn" },
    { element: continueBtn, name: "continueBtn" },
    { element: resetBtn, name: "resetBtn" },
    { element: editBtn, name: "editBtn" },
    { element: learnMoreBtn, name: "learnMoreBtn" },
    { element: statusBar, name: "statusBar" },
    { element: pageFaultsCounter, name: "pageFaults" },
    { element: pageHitsCounter, name: "pageHits" },
    { element: currentRefCounter, name: "currentRef" },
    { element: framesContainer, name: "framesContainer" },
  ]

  const missingElements = requiredElements.filter((item) => !item.element)

  if (missingElements.length > 0) {
    console.error("Missing DOM elements:", missingElements.map((item) => item.name).join(", "))
    alert("Error: Some UI elements could not be found. Please refresh the page or contact support.")
    return false
  }

  return true
}

// Sound error handling
function initializeSounds() {
  const soundElements = [
    { element: clickSound, name: "clickSound" },
    { element: stepSound, name: "stepSound" },
    { element: hitSound, name: "hitSound" },
    { element: faultSound, name: "faultSound" },
  ]

  const missingSounds = soundElements.filter((item) => !item.element)

  if (missingSounds.length > 0) {
    console.warn("Missing sound elements:", missingSounds.map((item) => item.name).join(", "))
    return false
  }

  return true
}

// Helper function to stop and clear a sound
function stopSound(soundType) {
  try {
    if (currentSounds[soundType]) {
      currentSounds[soundType].pause()
      currentSounds[soundType].currentTime = 0
      currentSounds[soundType] = null
    }
  } catch (error) {
    console.warn(`Error stopping ${soundType} sound:`, error)
  }
}

// Helper function to play a sound
function playSound(soundType, soundElement) {
  try {
    if (!soundElement) {
      console.warn(`Sound element for ${soundType} not found`)
      return
    }

    stopSound(soundType) // Stop any existing sound of this type
    currentSounds[soundType] = soundElement.cloneNode() // Clone to allow overlapping
    currentSounds[soundType].play().catch((e) => console.warn(`${soundType} sound play failed:`, e))
  } catch (error) {
    console.warn(`Error playing ${soundType} sound:`, error)
  }
}

// Event Listeners - with error handling
function setupEventListeners() {
  try {
    getStartedBtn.addEventListener("click", () => {
      playSound("getStarted", clickSound)
      frontPage.style.display = "none"
      algorithmPage.style.display = "block"

      // Add animation to algorithm boxes
      const boxes = document.querySelectorAll(".algorithm-box")
      boxes.forEach((box, index) => {
        box.style.opacity = "0"
        box.style.animation = `fadeIn 0.5s forwards ${index * 0.2}s`
      })
    })

    goToSimulatorBtn.addEventListener("click", () => {
      algorithmPage.style.display = "none"
      mainPage.style.display = "block"
    })

    // Stop getStarted sound when typing
    refStringInput.addEventListener("input", () => {
      stopSound("getStarted")
    })

    runBtn.addEventListener("click", startSimulation)
    stopBtn.addEventListener("click", pauseSimulation)
    continueBtn.addEventListener("click", continueSimulation)
    resetBtn.addEventListener("click", resetSimulation)
    editBtn.addEventListener("click", editSimulation)

    // Algorithm page navigation
    learnMoreBtn.addEventListener("click", () => {
      mainPage.style.display = "none"
      algorithmPage.style.display = "block"

      // Add animation to algorithm boxes
      const boxes = document.querySelectorAll(".algorithm-box")
      boxes.forEach((box, index) => {
        box.style.opacity = "0"
        box.style.animation = `fadeIn 0.5s forwards ${index * 0.2}s`
      })
    })

    return true
  } catch (error) {
    console.error("Error setting up event listeners:", error)
    updateStatus("Error setting up application. Please refresh the page.", "error")
    return false
  }
}

// Animation Helper Functions
function animatePageMovement(page, sourceElement, targetElement, isFault) {
  try {
    // Make sure source and target elements exist
    if (!sourceElement || !targetElement) {
      console.error("Animation error: Source or target element is missing")
      return
    }

    // Create the floating page element
    const floatingPage = document.createElement("div")
    floatingPage.className = "floating-page"
    floatingPage.textContent = page

    // Style based on hit or fault
    if (isFault) {
      floatingPage.style.backgroundColor = "#ffebee"
      floatingPage.style.color = "#f44336"
      floatingPage.style.border = "2px solid #f44336"
    } else {
      floatingPage.style.backgroundColor = "#e8f5e9"
      floatingPage.style.color = "#4CAF50"
      floatingPage.style.border = "2px solid #4CAF50"
    }

    // Add to the DOM
    document.body.appendChild(floatingPage)

    // Get positions for animation
    const sourceRect = sourceElement.getBoundingClientRect()
    const targetRect = targetElement.getBoundingClientRect()

    // Set initial position
    floatingPage.style.position = "fixed"
    floatingPage.style.top = `${sourceRect.top}px`
    floatingPage.style.left = `${sourceRect.left}px`
    floatingPage.style.width = `${sourceRect.width}px`
    floatingPage.style.height = `${sourceRect.height}px`
    floatingPage.style.zIndex = "9999"

    // Force reflow to ensure initial position is applied
    void floatingPage.offsetWidth

    // Animate to target position
    setTimeout(() => {
      floatingPage.style.transition = "all 0.5s ease"
      floatingPage.style.top = `${targetRect.top}px`
      floatingPage.style.left = `${targetRect.left}px`
      floatingPage.style.width = `${targetRect.width}px`
      floatingPage.style.height = `${targetRect.height}px`

      // Remove after animation completes
      setTimeout(() => {
        if (floatingPage && floatingPage.parentNode) {
          floatingPage.remove()
        }
      }, 500)
    }, 50)
  } catch (error) {
    console.error("Animation error:", error)
  }
}

function highlightCurrentStep(stepIndex) {
  try {
    const refNumbers = document.querySelectorAll(".ref-number")
    refNumbers.forEach((el, idx) => {
      if (idx === stepIndex) {
        el.classList.add("active")
      } else {
        el.classList.remove("active")
      }
    })
  } catch (error) {
    console.warn("Error highlighting current step:", error)
  }
}

// Input validation functions
function validateReferenceString(inputString) {
  if (!inputString || inputString.trim() === "") {
    updateStatus("Error: Please enter a reference string", "error")
    return null
  }

  // Split by whitespace
  const refString = inputString.split(/\s+/)

  if (refString.length === 0 || refString.some((item) => item === "")) {
    updateStatus("Error: Invalid reference string format", "error")
    return null
  }

  // Check if each item is a valid page reference (letter or number)
  const validPagePattern = /^[A-Za-z0-9]$/
  const invalidItems = refString.filter((item) => !validPagePattern.test(item))

  if (invalidItems.length > 0) {
    updateStatus(
      `Error: Reference string must contain only single letters or numbers separated by spaces. Invalid items: ${invalidItems.join(", ")}`,
      "error",
    )
    return null
  }

  // Check if the reference string is too long (prevent performance issues)
  if (refString.length > 100) {
    if (!confirm("Warning: Large reference string may cause performance issues. Continue anyway?")) {
      updateStatus("Simulation cancelled", "error")
      return null
    }
  }

  return refString
}

function validateNumFrames(value) {
  const frames = Number.parseInt(value)

  if (isNaN(frames) || frames < 1) {
    updateStatus("Error: Number of frames must be at least 1", "error")
    return null
  }

  if (frames > 20) {
    if (!confirm("Warning: Large number of frames may affect visualization. Continue anyway?")) {
      updateStatus("Simulation cancelled", "error")
      return null
    }
  }

  return frames
}

// Main Functions
function startSimulation() {
  try {
    const inputString = refStringInput.value.trim()
    const validatedRefString = validateReferenceString(inputString)

    if (!validatedRefString) {
      return
    }

    referenceString = validatedRefString

    const validatedFrames = validateNumFrames(numFramesInput.value)
    if (validatedFrames === null) {
      return
    }

    numFrames = validatedFrames
    algorithm = algorithmSelect.value

    resetSimulation(false)
    simulationRunning = true

    runBtn.disabled = true
    stopBtn.disabled = false
    continueBtn.disabled = true
    editBtn.disabled = true

    updateStatus("Simulation Running", "running")
    displayReferenceString()
    runSimulationStep()
  } catch (error) {
    console.error("Error starting simulation:", error)
    updateStatus("Error starting simulation. Please try again.", "error")
    resetSimulation(false)
  }
}

function runSimulationStep() {
  try {
    // Stop any previous sounds before starting new ones
    stopSound("step")
    stopSound("hit")
    stopSound("fault")

    // Play the step sound for this simulation step
    playSound("step", stepSound)

    if (!simulationRunning) return

    currentStep++

    // Safety check for array bounds
    if (currentStep < 0 || currentStep >= referenceString.length + 1) {
      console.error("Step index out of bounds:", currentStep, "Reference string length:", referenceString.length)
      simulationComplete()
      return
    }

    currentRefCounter.textContent = currentStep >= referenceString.length ? "-" : referenceString[currentStep]

    if (currentStep >= referenceString.length) {
      simulationComplete()
      return
    }

    const currentPage = referenceString[currentStep]
    const framesCopy = [...frames]
    let replacedFrameIndex = -1
    let stepResult = ""
    let stepExplanation = ""

    highlightCurrentStep(currentStep)

    const pageIndex = frames.indexOf(currentPage)
    if (pageIndex !== -1) {
      // Page hit - stop any previous hit sound and play new one
      stopSound("hit")
      playSound("hit", hitSound)

      pageHits++
      pageHitsCounter.textContent = pageHits
      stepResult = "hit"
      stepExplanation = `Page ${currentPage} already in Frame ${pageIndex + 1}`

      if (algorithm === "LRU") {
        lruStack = lruStack.filter((page) => page !== currentPage)
        lruStack.push(currentPage)
      }

      const rowElement = createFrameRow(
        currentPage,
        framesCopy,
        frames,
        replacedFrameIndex,
        stepResult,
        stepExplanation,
      )

      // Delay animation to ensure DOM is ready
      setTimeout(() => {
        try {
          const hitFrame = rowElement.querySelector(`.frame:nth-child(${pageIndex + 1})`)
          const activeRef = document.querySelector(".ref-number.active")
          if (hitFrame && activeRef) {
            animatePageMovement(currentPage, activeRef, hitFrame, false)
          }
        } catch (animError) {
          console.warn("Animation error:", animError)
        }
      }, 300)
    } else {
      // Page fault - stop any previous fault sound and play new one
      stopSound("fault")
      playSound("fault", faultSound)

      pageFaults++
      pageFaultsCounter.textContent = pageFaults
      stepResult = "fault"

      if (frames.includes(null)) {
        const emptyIndex = frames.indexOf(null)
        frames[emptyIndex] = currentPage
        stepExplanation = `Page ${currentPage} loaded into empty Frame ${emptyIndex + 1}`

        const rowElement = createFrameRow(
          currentPage,
          framesCopy,
          frames,
          replacedFrameIndex,
          stepResult,
          stepExplanation,
        )

        // Delay animation to ensure DOM is ready
        setTimeout(() => {
          try {
            const targetFrame = rowElement.querySelectorAll(".frame")[emptyIndex]
            const activeRef = document.querySelector(".ref-number.active")
            if (targetFrame && activeRef) {
              animatePageMovement(currentPage, activeRef, targetFrame, true)
            }
          } catch (animError) {
            console.warn("Animation error:", animError)
          }
        }, 300)

        if (algorithm === "FIFO") {
          fifoQueue.push({ page: currentPage, frameIndex: emptyIndex })
        }
        if (algorithm === "LRU") {
          lruStack.push(currentPage)
        }
      } else {
        if (algorithm === "FIFO") {
          // Check if fifoQueue is empty (shouldn't happen, but just in case)
          if (fifoQueue.length === 0) {
            console.error("FIFO queue is empty when it shouldn't be")
            updateStatus("Error in FIFO algorithm. Resetting simulation.", "error")
            resetSimulation(false)
            return
          }

          const oldest = fifoQueue.shift()
          replacedFrameIndex = oldest.frameIndex
          const replacedPage = frames[replacedFrameIndex]
          frames[replacedFrameIndex] = currentPage
          fifoQueue.push({ page: currentPage, frameIndex: replacedFrameIndex })
          stepExplanation = `Page ${replacedPage} replaced with ${currentPage} in Frame ${replacedFrameIndex + 1}`

          const rowElement = createFrameRow(
            currentPage,
            framesCopy,
            frames,
            replacedFrameIndex,
            stepResult,
            stepExplanation,
          )

          // Delay animation to ensure DOM is ready
          setTimeout(() => {
            try {
              const targetFrame = rowElement.querySelectorAll(".frame")[replacedFrameIndex]
              const activeRef = document.querySelector(".ref-number.active")
              if (targetFrame && activeRef) {
                animatePageMovement(currentPage, activeRef, targetFrame, true)
              }
            } catch (animError) {
              console.warn("Animation error:", animError)
            }
          }, 300)
        } else if (algorithm === "LRU") {
          // Check if lruStack is empty (shouldn't happen, but just in case)
          if (lruStack.length === 0) {
            console.error("LRU stack is empty when it shouldn't be")
            updateStatus("Error in LRU algorithm. Resetting simulation.", "error")
            resetSimulation(false)
            return
          }

          const leastRecentPage = lruStack.shift()
          replacedFrameIndex = frames.indexOf(leastRecentPage)

          // Safety check for invalid index
          if (replacedFrameIndex === -1) {
            console.error("LRU page not found in frames:", leastRecentPage, "Frames:", frames)
            // Fallback to first frame
            replacedFrameIndex = 0
          }

          const replacedPage = frames[replacedFrameIndex]
          frames[replacedFrameIndex] = currentPage
          lruStack.push(currentPage)
          stepExplanation = `Page ${replacedPage} replaced with ${currentPage} in Frame ${replacedFrameIndex + 1}`

          const rowElement = createFrameRow(
            currentPage,
            framesCopy,
            frames,
            replacedFrameIndex,
            stepResult,
            stepExplanation,
          )

          // Delay animation to ensure DOM is ready
          setTimeout(() => {
            try {
              const targetFrame = rowElement.querySelectorAll(".frame")[replacedFrameIndex]
              const activeRef = document.querySelector(".ref-number.active")
              if (targetFrame && activeRef) {
                animatePageMovement(currentPage, activeRef, targetFrame, true)
              }
            } catch (animError) {
              console.warn("Animation error:", animError)
            }
          }, 300)
        } else if (algorithm === "Optimal") {
          let farthestNextUse = -1
          let pageToReplace = null

          for (let i = 0; i < frames.length; i++) {
            const page = frames[i]
            const nextUse = referenceString.slice(currentStep + 1).indexOf(page)

            if (nextUse === -1) {
              pageToReplace = page
              replacedFrameIndex = i
              break
            }

            if (nextUse > farthestNextUse) {
              farthestNextUse = nextUse
              pageToReplace = page
              replacedFrameIndex = i
            }
          }

          // Safety check for invalid index
          if (replacedFrameIndex === -1 || replacedFrameIndex >= frames.length) {
            console.error("Invalid replacement index in Optimal algorithm:", replacedFrameIndex)
            // Fallback to first frame
            replacedFrameIndex = 0
          }

          const replacedPage = frames[replacedFrameIndex]
          frames[replacedFrameIndex] = currentPage
          stepExplanation = `Page ${replacedPage} replaced with ${currentPage} in Frame ${replacedFrameIndex + 1}`

          const rowElement = createFrameRow(
            currentPage,
            framesCopy,
            frames,
            replacedFrameIndex,
            stepResult,
            stepExplanation,
          )

          // Delay animation to ensure DOM is ready
          setTimeout(() => {
            try {
              const targetFrame = rowElement.querySelectorAll(".frame")[replacedFrameIndex]
              const activeRef = document.querySelector(".ref-number.active")
              if (targetFrame && activeRef) {
                animatePageMovement(currentPage, activeRef, targetFrame, true)
              }
            } catch (animError) {
              console.warn("Animation error:", animError)
            }
          }, 300)
        }
      }
    }

    simulationInterval = setTimeout(runSimulationStep, 1500)
  } catch (error) {
    console.error("Error in simulation step:", error)
    updateStatus("Error in simulation. Please reset and try again.", "error")
    pauseSimulation()
  }
}

function pauseSimulation() {
  try {
    simulationRunning = false
    clearTimeout(simulationInterval)
    stopBtn.disabled = true
    continueBtn.disabled = false
    updateStatus("Simulation Paused", "paused")
  } catch (error) {
    console.error("Error pausing simulation:", error)
    updateStatus("Error pausing simulation", "error")
  }
}

function continueSimulation() {
  try {
    simulationRunning = true
    continueBtn.disabled = true
    stopBtn.disabled = false
    updateStatus("Simulation Running", "running")
    runSimulationStep()
  } catch (error) {
    console.error("Error continuing simulation:", error)
    updateStatus("Error continuing simulation", "error")
  }
}

function resetSimulation(resetInputs = true) {
  try {
    // Stop all sounds
    Object.keys(currentSounds).forEach((soundType) => {
      stopSound(soundType)
    })

    simulationRunning = false
    clearTimeout(simulationInterval)
    currentStep = -1
    pageFaults = 0
    pageHits = 0

    // Make sure numFrames is valid before creating the frames array
    const validFrames = resetInputs ? 3 : isNaN(numFrames) || numFrames < 1 ? 3 : numFrames
    frames = Array(validFrames).fill(null)

    fifoQueue = []
    lruStack = []
    lfuCounts = {}

    if (resetInputs) {
      refStringInput.value = ""
      numFramesInput.value = "3"
      algorithmSelect.value = "FIFO"
    }

    pageFaultsCounter.textContent = "0"
    pageHitsCounter.textContent = "0"
    currentRefCounter.textContent = "-"

    if (framesContainer) {
      framesContainer.innerHTML = ""
    }

    updateStatus("Ready")

    // Clean up any floating pages that might be left
    document.querySelectorAll(".floating-page").forEach((el) => {
      try {
        el.remove()
      } catch (removeError) {
        console.warn("Error removing floating page:", removeError)
      }
    })

    runBtn.disabled = false
    stopBtn.disabled = true
    continueBtn.disabled = true
    editBtn.disabled = false
  } catch (error) {
    console.error("Error resetting simulation:", error)
    updateStatus("Error resetting simulation", "error")

    // Fallback reset for critical UI elements
    runBtn.disabled = false
    stopBtn.disabled = true
    continueBtn.disabled = true
  }
}

function editSimulation() {
  try {
    resetSimulation(false)
    updateStatus("Edit Mode - Adjust parameters and run again")
  } catch (error) {
    console.error("Error entering edit mode:", error)
    updateStatus("Error entering edit mode", "error")
  }
}

function updateStatus(message, type = "") {
  try {
    if (statusBar) {
      statusBar.textContent = message
      statusBar.className = "status-bar"

      if (type) {
        statusBar.classList.add(type)
      }
    } else {
      console.error("Status bar element not found")
    }
  } catch (error) {
    console.error("Error updating status:", error)
  }
}

function displayReferenceString() {
  try {
    if (!framesContainer) {
      console.error("Frames container not found")
      return
    }

    const refStringDisplay = document.createElement("div")
    refStringDisplay.className = "ref-string-display"

    if (!Array.isArray(referenceString)) {
      console.error("Reference string is not an array:", referenceString)
      updateStatus("Error: Invalid reference string format", "error")
      return
    }

    referenceString.forEach((num, idx) => {
      const numElement = document.createElement("div")
      numElement.className = "ref-number"
      numElement.textContent = num
      refStringDisplay.appendChild(numElement)
    })

    framesContainer.innerHTML = ""
    framesContainer.appendChild(refStringDisplay)
  } catch (error) {
    console.error("Error displaying reference string:", error)
    updateStatus("Error displaying reference string", "error")
  }
}

// Update the createFrameRow function to improve alignment and add error handling
function createFrameRow(currentPage, oldFrames, newFrames, replacedIndex, result, explanation) {
  try {
    if (!framesContainer) {
      console.error("Frames container not found")
      return null
    }

    const rowDiv = document.createElement("div")
    rowDiv.className = "frame-row"

    // Create a container for the step info to ensure consistent width
    const stepInfoContainer = document.createElement("div")
    stepInfoContainer.className = "step-info-container"

    const stepInfo = document.createElement("div")
    stepInfo.className = "step-info"
    stepInfo.innerHTML = `<strong>Step ${currentStep + 1}:</strong> ${explanation}`
    stepInfoContainer.appendChild(stepInfo)
    rowDiv.appendChild(stepInfoContainer)

    const framesDiv = document.createElement("div")
    framesDiv.className = "frames-row"

    // Safety check for numFrames
    const safeNumFrames = isNaN(numFrames) || numFrames < 1 ? 3 : numFrames

    for (let i = 0; i < safeNumFrames; i++) {
      const frameDiv = document.createElement("div")
      frameDiv.className = "frame"

      // Safety check for array bounds
      if (!newFrames || i >= newFrames.length) {
        frameDiv.classList.add("empty")
        frameDiv.textContent = "-"
      } else if (newFrames[i] === null) {
        frameDiv.classList.add("empty")
        frameDiv.textContent = "-"
      } else {
        frameDiv.textContent = newFrames[i]
      }

      if (i === replacedIndex) {
        frameDiv.classList.add("replaced")
      }

      if (result === "hit" && newFrames && i < newFrames.length && newFrames[i] === currentPage) {
        frameDiv.classList.add("hit")
      } else if (result === "fault" && newFrames && i < newFrames.length && newFrames[i] === currentPage) {
        frameDiv.classList.add("fault")
      }

      framesDiv.appendChild(frameDiv)
    }

    rowDiv.appendChild(framesDiv)

    const resultDiv = document.createElement("div")
    resultDiv.className = `result ${result}`
    resultDiv.textContent = result === "hit" ? "HIT" : "FAULT"
    rowDiv.appendChild(resultDiv)

    framesContainer.appendChild(rowDiv)

    // Add fade-in animation
    rowDiv.style.opacity = "0"
    rowDiv.style.animation = "fadeIn 0.5s forwards"

    // Scroll to the new row
    setTimeout(() => {
      try {
        rowDiv.scrollIntoView({ behavior: "smooth", block: "nearest" })
      } catch (scrollError) {
        console.warn("Error scrolling to new row:", scrollError)
      }
    }, 100)

    return rowDiv
  } catch (error) {
    console.error("Error creating frame row:", error)
    return null
  }
}

function simulationComplete() {
  try {
    stopSound("hit")
    playSound("hit", hitSound)

    simulationRunning = false
    clearTimeout(simulationInterval)

    const totalReferences = pageFaults + pageHits
    const hitRatio = totalReferences > 0 ? (pageHits / totalReferences) * 100 : 0

    runBtn.disabled = false
    stopBtn.disabled = true
    continueBtn.disabled = true
    editBtn.disabled = false

    updateStatus("Simulation Complete", "complete")

    if (!framesContainer) {
      console.error("Frames container not found")
      return
    }

    const summaryDiv = document.createElement("div")
    summaryDiv.className = "summary"
    summaryDiv.innerHTML = `
          <h3>Simulation Summary</h3>
          <p>Algorithm: ${algorithm}</p>
          <p>Total References: ${totalReferences}</p>
          <p>Page Hits: ${pageHits}</p>
          <p>Page Faults: ${pageFaults}</p>
          <p>Hit Ratio: ${hitRatio.toFixed(2)}%</p>
      `
    framesContainer.appendChild(summaryDiv)

    try {
      summaryDiv.scrollIntoView({ behavior: "smooth" })
    } catch (scrollError) {
      console.warn("Error scrolling to summary:", scrollError)
    }
  } catch (error) {
    console.error("Error completing simulation:", error)
    updateStatus("Error completing simulation", "error")
  }
}

// Initialize the application with error handling
function initializeApp() {
  try {
    // Check if all required DOM elements exist
    if (!checkDOMElements()) {
      return false
    }

    // Initialize sounds (non-critical, so continue even if it fails)
    initializeSounds()

    // Set up event listeners
    if (!setupEventListeners()) {
      return false
    }

    // Initial status
    updateStatus("Ready")

    return true
  } catch (error) {
    console.error("Error initializing application:", error)
    alert("Error initializing application. Please refresh the page or contact support.")
    return false
  }
}

// Call the initialization function when the page loads
window.addEventListener("load", initializeApp)

// Handle unhandled errors
window.addEventListener("error", (event) => {
  console.error("Unhandled error:", event.error)
  updateStatus("An unexpected error occurred. Please refresh the page.", "error")
})
