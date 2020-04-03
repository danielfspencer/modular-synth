/* exported logToNormal, normalToLog */

const LOG_SLIDER_MIN = 0
const LOG_SLIDER_MAX = 10000

function normalToLog (value, min, max) {
  const minValue = Math.log(min)
  const maxValue = Math.log(max)
  const scale = (maxValue - minValue) / (LOG_SLIDER_MAX - LOG_SLIDER_MIN)

  return LOG_SLIDER_MIN + (Math.log(value) - minValue) / scale
}

function logToNormal (position, min, max) {
  const minValue = Math.log(min)
  const maxValue = Math.log(max)
  const scale = (maxValue - minValue) / (LOG_SLIDER_MAX - LOG_SLIDER_MIN)

  return Math.exp(minValue + scale * (position - LOG_SLIDER_MIN))
}
