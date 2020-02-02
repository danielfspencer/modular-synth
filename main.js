let droop = 80
let activeItem = null
let nodes = []

let canvasElement
let canvasCtx

document.addEventListener('DOMContentLoaded', () => {
  canvasElement = document.querySelector('#canvas')
  canvasCtx = canvasElement.getContext('2d')

  window.addEventListener('resize', initCanvas)
  initCanvas()

  let container = document.querySelector("#container")
  container.addEventListener("touchstart", dragStart)
  container.addEventListener("touchend", dragEnd)
  container.addEventListener("touchmove", drag)
  container.addEventListener("mousedown", dragStart)
  container.addEventListener("mouseup", dragEnd)
  container.addEventListener("mousemove", drag)
})

function initCanvas() {
  canvasCtx.canvas.width = window.innerWidth
  canvasCtx.canvas.height = window.innerHeight

  canvasCtx.lineWidth = 4
  canvasCtx.lineCap = "round"

  draw()
}

function draw () {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height)

  for (let pair of nodes) {
    drawLine(getCoords(pair[0]), getCoords(pair[1]))
  }
}

function lerp (start, end, fraction) {
  return start + ((end - start) * fraction)
}

function drawLine (start, end) {
  const midpoint = [lerp(start[0], end[0], 0.5), lerp(start[1], end[1], 0.5)]
  midpoint[1] += droop

  canvasCtx.beginPath()
  canvasCtx.moveTo(...start)
  canvasCtx.quadraticCurveTo(...midpoint, ...end)
  canvasCtx.stroke()
}

function getCoords (element) {
  const rect = element.getBoundingClientRect()
  return [rect.x + rect.width / 2, rect.y + rect.height / 2]
}

///

function dragStart(e) {
  if (e.target.className == "module-header") {
    activeItem = e.target.parentNode

    if (!activeItem.xOffset) {
      activeItem.xOffset = 0
    }

    if (!activeItem.yOffset) {
      activeItem.yOffset = 0
    }

    if (e.type === "touchstart") {
      activeItem.initialX = e.touches[0].clientX - activeItem.xOffset
      activeItem.initialY = e.touches[0].clientY - activeItem.yOffset
    } else {
      activeItem.initialX = e.clientX - activeItem.xOffset
      activeItem.initialY = e.clientY - activeItem.yOffset
    }

    e.stopPropagation()
  }
}

function dragEnd(e) {
  if (activeItem !== null) {
    activeItem.initialX = activeItem.currentX
    activeItem.initialY = activeItem.currentY
    draw()
  }
  activeItem = null
}

function drag(e) {
  if (activeItem !== null) {
    e.preventDefault()
    if (e.type === "touchmove") {
      activeItem.currentX = e.touches[0].clientX - activeItem.initialX
      activeItem.currentY = e.touches[0].clientY - activeItem.initialY
    } else {
      activeItem.currentX = e.clientX - activeItem.initialX
      activeItem.currentY = e.clientY - activeItem.initialY
    }

    activeItem.xOffset = activeItem.currentX
    activeItem.yOffset = activeItem.currentY

    activeItem.style.transform = `translate3d(${activeItem.currentX}px, ${activeItem.currentY}px, 0)`
    draw()
  }
}
