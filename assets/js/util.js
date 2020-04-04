const MIDDLE_A = 440
const SEMITONE = 69
const NOTE_NAMES = ['C ', 'C#', 'D ', 'D#', 'E ', 'F ', 'F#', 'G ', 'G#', 'A ', 'A#', 'B ']
const IN_TUNE_THRESHOLD = 10

function noteFromFreq (freq) { // eslint-disable-line no-unused-vars
  const note = 12 * (Math.log(freq / MIDDLE_A) / Math.log(2))
  const value = Math.round(note) + SEMITONE
  const octave = parseInt(value / 12) - 1
  const cents = getCents(freq, value)

  if (Math.abs(cents) <= IN_TUNE_THRESHOLD) {
    return `<div class='in-tune'>${NOTE_NAMES[value % 12]}${octave}</div>`
  } else {
    return `<div class='out-of-tune'>${NOTE_NAMES[value % 12]}${octave} ${cents < 0 ? '-' : '+'}${Math.abs(cents)}c</div>`
  }
}

function getCents (freq, note) {
  return Math.floor((1200 * Math.log(freq / getNoteFreq(note))) / Math.log(2))
}

function getNoteFreq (note) {
  return MIDDLE_A * Math.pow(2, (note - SEMITONE) / 12)
}

const LOG_SLIDER_MIN = 0
const LOG_SLIDER_MAX = 10000

function valueToPosition (value, min, max) { // eslint-disable-line no-unused-vars
  const minValue = Math.log(min)
  const maxValue = Math.log(max)
  const scale = (maxValue - minValue) / (LOG_SLIDER_MAX - LOG_SLIDER_MIN)

  return LOG_SLIDER_MIN + (Math.log(value) - minValue) / scale
}

function positionToValue (position, min, max) { // eslint-disable-line no-unused-vars
  const minValue = Math.log(min)
  const maxValue = Math.log(max)
  const scale = (maxValue - minValue) / (LOG_SLIDER_MAX - LOG_SLIDER_MIN)

  return Math.exp(minValue + scale * (position - LOG_SLIDER_MIN))
}
