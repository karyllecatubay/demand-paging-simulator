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

// Helper function to stop and clear a sound
function stopSound(soundType) {
  if (currentSounds[soundType]) {
    currentSounds[soundType].pause()
    currentSounds[soundType].currentTime = 0
    currentSounds[soundType] = null
  }
}

// Helper function to play a sound
function playSound(soundType, soundElement) {
  stopSound(soundType) // Stop any existing sound of this type
  currentSounds[soundType] = soundElement.cloneNode() // Clone to allow overlapping
  currentSounds[soundType].play().catch((e) => console.log(`${soundType} sound play failed:`, e))
}

// Event Listeners
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

// Animation Helper Functions
function animatePageMovement(page, sourceElement, targetElement, isFault) {
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
      if (floatingPage.parentNode) {
        floatingPage.remove()
      }
    }, 500)
  }, 50)
}

function highlightCurrentStep(stepIndex) {
  const refNumbers = document.querySelectorAll(".ref-number")
  refNumbers.forEach((el, idx) => {
    if (idx === stepIndex) {
      el.classList.add("active")
    } else {
      el.classList.remove("active")
    }
  })
}

// Main Functions
function startSimulation() {
  const inputString = refStringInput.value.trim()
  if (!inputString) {
    updateStatus("Error: Please enter a reference string", "error")
    return
  }

  // Split by whitespace and allow both letters and numbers
  referenceString = inputString.split(/\s+/)
  if (referenceString.some((item) => item === "")) {
    updateStatus("Error: Invalid reference string format", "error")
    return
  }

  numFrames = Number.parseInt(numFramesInput.value)
  if (isNaN(numFrames) || numFrames < 1) {
    updateStatus("Error: Number of frames must be at least 1", "error")
    return
  }

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
}

function runSimulationStep() {
  // Stop any previous sounds before starting new ones
  stopSound("step")
  stopSound("hit")
  stopSound("fault")

  // Play the step sound for this simulation step
  playSound("step", stepSound)

  if (!simulationRunning) return

  currentStep++
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

    const rowElement = createFrameRow(currentPage, framesCopy, frames, replacedFrameIndex, stepResult, stepExplanation)

    // Delay animation to ensure DOM is ready
    setTimeout(() => {
      const hitFrame = rowElement.querySelector(`.frame:nth-child(${pageIndex + 1})`)
      const activeRef = document.querySelector(".ref-number.active")
      if (hitFrame && activeRef) {
        animatePageMovement(currentPage, activeRef, hitFrame, false)
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
        const targetFrame = rowElement.querySelectorAll(".frame")[emptyIndex]
        const activeRef = document.querySelector(".ref-number.active")
        if (targetFrame && activeRef) {
          animatePageMovement(currentPage, activeRef, targetFrame, true)
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
          const targetFrame = rowElement.querySelectorAll(".frame")[replacedFrameIndex]
          const activeRef = document.querySelector(".ref-number.active")
          if (targetFrame && activeRef) {
            animatePageMovement(currentPage, activeRef, targetFrame, true)
          }
        }, 300)
      } else if (algorithm === "LRU") {
        const leastRecentPage = lruStack.shift()
        replacedFrameIndex = frames.indexOf(leastRecentPage)
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
          const targetFrame = rowElement.querySelectorAll(".frame")[replacedFrameIndex]
          const activeRef = document.querySelector(".ref-number.active")
          if (targetFrame && activeRef) {
            animatePageMovement(currentPage, activeRef, targetFrame, true)
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
          const targetFrame = rowElement.querySelectorAll(".frame")[replacedFrameIndex]
          const activeRef = document.querySelector(".ref-number.active")
          if (targetFrame && activeRef) {
            animatePageMovement(currentPage, activeRef, targetFrame, true)
          }
        }, 300)
      }
    }
  }

  simulationInterval = setTimeout(runSimulationStep, 1500)
}

function pauseSimulation() {
  simulationRunning = false
  clearTimeout(simulationInterval)
  stopBtn.disabled = true
  continueBtn.disabled = false
  updateStatus("Simulation Paused", "paused")
}

function continueSimulation() {
  simulationRunning = true
  continueBtn.disabled = true
  stopBtn.disabled = false
  updateStatus("Simulation Running", "running")
  runSimulationStep()
}

function resetSimulation(resetInputs = true) {
  // Stop all sounds
  Object.keys(currentSounds).forEach((soundType) => {
    stopSound(soundType)
  })

  simulationRunning = false
  clearTimeout(simulationInterval)
  currentStep = -1
  pageFaults = 0
  pageHits = 0
  frames = Array(numFrames).fill(null)
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
  framesContainer.innerHTML = ""
  updateStatus("Ready")

  document.querySelectorAll(".floating-page").forEach((el) => el.remove())

  runBtn.disabled = false
  stopBtn.disabled = true
  continueBtn.disabled = true
  editBtn.disabled = false
}

function editSimulation() {
  resetSimulation(false)
  updateStatus("Edit Mode - Adjust parameters and run again")
}

function updateStatus(message, type = "") {
  statusBar.textContent = message
  statusBar.className = "status-bar"

  if (type) {
    statusBar.classList.add(type)
  }
}

function displayReferenceString() {
  const refStringDisplay = document.createElement("div")
  refStringDisplay.className = "ref-string-display"

  referenceString.forEach((num, idx) => {
    const numElement = document.createElement("div")
    numElement.className = "ref-number"
    numElement.textContent = num
    refStringDisplay.appendChild(numElement)
  })

  framesContainer.innerHTML = ""
  framesContainer.appendChild(refStringDisplay)
}

// Update the createFrameRow function to improve alignment
function createFrameRow(currentPage, oldFrames, newFrames, replacedIndex, result, explanation) {
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

  for (let i = 0; i < numFrames; i++) {
    const frameDiv = document.createElement("div")
    frameDiv.className = "frame"

    if (newFrames[i] === null) {
      frameDiv.classList.add("empty")
      frameDiv.textContent = "-"
    } else {
      frameDiv.textContent = newFrames[i]
    }

    if (i === replacedIndex) {
      frameDiv.classList.add("replaced")
    }

    if (result === "hit" && newFrames[i] === currentPage) {
      frameDiv.classList.add("hit")
    } else if (result === "fault" && newFrames[i] === currentPage) {
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
    rowDiv.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, 100)

  return rowDiv
}

function simulationComplete() {
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
  summaryDiv.scrollIntoView({ behavior: "smooth" })
}
