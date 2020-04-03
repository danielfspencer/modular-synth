/* global init, AudioContext, Event */

const droop = 80
let activeItem = null
let context = null
const edges = []

let canvasElement
let canvasCtx

let firstConnection = null

function connectionStart (element, node) {
  firstConnection = [element, node]
}

function connectionEnd (element, node) {
  connectPorts(firstConnection, [element, node])
}

function connectPorts ([elem1, node1], [elem2, node2]) {
  let node1Output = elem1.classList.contains("output")
  let node2Output = elem2.classList.contains("output")

  let outputNode
  let inputNode
  let outputElem
  let inputElem

  if (node1Output && !node2Output) {
    [outputNode, inputNode] = [node1, node2]
    ;[outputElem, inputElem] = [elem1, elem2]
  } else if (!node1Output && node2Output) {
    [outputNode, inputNode] = [node2, node1]
    ;[outputElem, inputElem] = [elem2, elem1]
  } else {
    console.log('- type miss-match')
    return
  }

  if (inputInGraph(inputElem)) {
    console.log('- in graph')
    return
  }

  outputNode.connect(inputNode)
  edges.push([[outputElem, outputNode], [inputElem, inputNode]])
  draw()
}

function disconnectPort (elem, node) {
  if (elem.classList.contains('output')) {
    console.log('- outputs cannot be disconnected')
    return
  }

  for (let i = 0; i < edges.length; i++) {
    const [[outputElem, outputNode], [inputElem, inputNode]] = edges[i]

    if (inputNode == node) {
      outputNode.disconnect(inputNode)
      edges.splice(i, 1)
      draw()
    }
  }
}

function inputInGraph (elem) {
  for (let [[outputElem, outputNode], [inputElem, inputNode]] of edges) {
    if (elem === inputElem) {
      return true
    }
  }

  return false
}

document.addEventListener('DOMContentLoaded', () => {
  canvasElement = document.querySelector('#canvas')
  canvasCtx = canvasElement.getContext('2d')

  window.addEventListener('resize', initCanvas)

  context = new AudioContext()
  context.suspend()

  document.addEventListener('touchstart', dragStart, true)
  document.addEventListener('touchend', dragEnd, true)
  document.addEventListener('touchmove', drag)
  document.addEventListener('mousedown', dragStart, true)
  document.addEventListener('mouseup', dragEnd, true)
  document.addEventListener('mousemove', drag)

  document.addEventListener('contextmenu', (event) => event.preventDefault())

  document.addEventListener('touchend', touchEndHack)

  document.querySelector('#start').addEventListener('click', () => context.resume())
  document.querySelector('#stop').addEventListener('click', () => context.suspend())

  init()
  initCanvas()
})

function touchEndHack (event) {
  // dispatch a mouseUp event at the element the touch was above when it was released
  const coords = [event.changedTouches[0].pageX, event.changedTouches[0].pageY]
  const elem = document.elementFromPoint(...coords)
  if (elem !== undefined) {
    elem.dispatchEvent(new Event('mouseup', { bubbles: true }))
  }
}

function initCanvas () {
  canvasCtx.canvas.width = window.innerWidth
  canvasCtx.canvas.height = window.innerHeight

  canvasCtx.lineWidth = 4
  canvasCtx.lineCap = 'round'

  draw()
}

function draw () {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height)

  for (const [[outputElem, outputNode], [inputElem, inputNode]] of edges) {
    drawLine(getCoords(outputElem), getCoords(inputElem))
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
  return [(window.pageXOffset + rect.left ) + rect.width / 2, (window.pageYOffset + rect.top) + rect.height / 2]
}

function dragStart (e) {
  if (e.target.className === 'module-header') {
    activeItem = e.target.parentNode

    if (!activeItem.xOffset) {
      activeItem.xOffset = 0
    }

    if (!activeItem.yOffset) {
      activeItem.yOffset = 0
    }

    if (e.type === 'touchstart') {
      activeItem.initialX = e.touches[0].clientX - activeItem.xOffset
      activeItem.initialY = e.touches[0].clientY - activeItem.yOffset
    } else {
      activeItem.initialX = e.clientX - activeItem.xOffset
      activeItem.initialY = e.clientY - activeItem.yOffset
    }

    e.stopPropagation()
  }
}

function dragEnd (e) {
  if (activeItem !== null) {
    activeItem.initialX = activeItem.currentX
    activeItem.initialY = activeItem.currentY
    draw()
  }
  activeItem = null
}

function drag (e) {
  if (activeItem !== null) {
    e.preventDefault()
    if (e.type === 'touchmove') {
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