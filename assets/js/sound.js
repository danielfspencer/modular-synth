/* global context, connectionStart, connectionEnd, disconnectPort, GainNode, OscillatorNode,
BiquadFilterNode, LOG_SLIDER_MIN, LOG_SLIDER_MAX, normalToLog, logToNormal */

class Module {
  constructor () {
    this.nodes = {}

    this.input = {}
    this.output = {}
    this.tune = {}

    this.div = document.createElement('div')
    this.labels = { module: 'unknown', tune: {}, inputs: {}, outputs: {} }
  }

  getHTMLObject () {
    this.div.className = 'module'

    let tunings = ''
    for (const tuning of Object.keys(this.tune)) {
      const tune = this.tune[tuning]
      const currValue = Math.round(tune.get() * 10) / 10

      tunings += `<div class='param-container'><div>${this.labels.tune[tuning]}</div><div class='param-placeholder'>
      <div class='range-slider'>`
      if (tune.range) {
        let range = ''
        switch (tune.range.type) {
          case 'log': {
            const initial = normalToLog(tune.range.default, tune.range.min, tune.range.max)
            range = `min='${LOG_SLIDER_MIN}' max='${LOG_SLIDER_MAX}' value='${initial}' step='1'`
          } break
          default:
            range = `min='${tune.range.min}' max='${tune.range.max}' step='0.1'`
            break
        }
        tunings += `<input type='range' id='${tuning}' name='${tuning}' ${range}>`
      }

      tunings += '</div></div></div>'
    }

    let inputs = ''
    for (const input of Object.keys(this.input)) {
      inputs += `<div class='module-connector-label input'><div>${this.labels.inputs[input]}</div>
      <div class='module-connector input' id='${input}'></div></div>`
    }

    let outputs = ''
    for (const output of Object.keys(this.output)) {
      outputs += `<div class='module-connector-label output'><div>${this.labels.outputs[output]}</div>
      <div class='module-connector output' id='${output}'></div></div>`
    }

    const tuningsPresent = Object.keys(this.tune).length !== 0

    this.div.innerHTML = `
      <div class='module-header'>${this.labels.module}</div>
      <div class='module-body'>
        <div class='module-tuning'>
          ${tunings}
        </div>
        ${(tuningsPresent) ? '<hr>' : ''}
        <div class='module-io'>
          ${inputs}
        </div><div class='module-io'>
          ${outputs}
        </div>
      </div>`

    return this.div
  }

  attachHandlers () {
    for (const [name, func] of Object.entries(this.tune)) {
      const element = this.div.querySelector(`#${name}`)
      element.addEventListener('input', (event) => {
        this._tuneableChanged(event, (value) => func.set(value))
      })

      element.parentNode.parentNode.addEventListener('click', (event) => {
        element.parentNode.classList.add('open')
        event.stopPropagation()
      })
    }

    document.addEventListener('click', (event) => this._closeAllSliders(event))

    for (const [name, audioNode] of Object.entries(this.output)) {
      const elem = this.div.querySelector(`#${name}.output`)

      elem.parentNode.addEventListener('mouseup', (event) => this._mouseUp(event, elem, audioNode))
      elem.parentNode.addEventListener('mousedown', (event) => this._mouseDown(event, elem, audioNode))
      elem.parentNode.addEventListener('touchstart', (event) => this._mouseDown(event, elem, audioNode))

      elem.parentNode.addEventListener('contextmenu', (event) => event.preventDefault())
    }

    for (const [name, audioNode] of Object.entries(this.input)) {
      const elem = this.div.querySelector(`#${name}.input`)

      elem.parentNode.addEventListener('mouseup', (event) => this._mouseUp(event, elem, audioNode))
      elem.parentNode.addEventListener('mousedown', (event) => this._mouseDown(event, elem, audioNode))
      elem.parentNode.addEventListener('touchstart', (event) => this._mouseDown(event, elem, audioNode))

      elem.parentNode.addEventListener('contextmenu', (event) => event.preventDefault())
    }
  }

  _mouseUp (event, elem, node) {
    event.preventDefault()
    if (event.which !== 3) {
      connectionEnd(elem, node)
    } else {
      disconnectPort(elem, node)
    }
  }

  _mouseDown (event, elem, node) {
    event.preventDefault()
    if (event.which !== 3) {
      connectionStart(elem, node)
    }
  }

  _tuneableChanged (event, callback) {
    if (event.target.validity.valid) {
      callback(parseFloat(event.target.value))
    }
    event.stopPropagation()
  }

  _closeAllSliders (event) {
    for (const name in this.tune) {
      const element = this.div.querySelector(`.range-slider #${name}`).parentNode
      if (event.target !== element) {
        element.classList.remove('open')
      }
    }
  }
}

class Oscillator extends Module {
  constructor () {
    super()
    const DEFAULT_FREQ = 440

    this.nodes.detune = new GainNode(context, { gain: 6000 })

    const types = ['sine', 'triangle', 'sawtooth', 'square']
    for (const type of types) {
      const oscillator = new OscillatorNode(context, {
        type: type,
        frequency: DEFAULT_FREQ
      })
      this.nodes.detune.connect(oscillator.detune)
      oscillator.start()
      this.nodes[type] = oscillator
    }

    this.tune = {
      freq: {
        range: { type: 'log', min: 50, max: 12000, default: DEFAULT_FREQ },
        get: () => normalToLog(this.nodes.sine.frequency.value, 50, 12000),
        set: (value) => {
          for (const type of types) {
            this.nodes[type].frequency.value = logToNormal(value, 50, 12000)
          }
        }
      }
    }

    this.input = {
      freq_mod: this.nodes.detune
    }

    this.output = {
      sin: this.nodes.sine,
      tri: this.nodes.triangle,
      saw: this.nodes.sawtooth,
      sqr: this.nodes.square
    }

    this.labels = {
      module: 'Oscillator',
      tune: { freq: 'Freq.' },
      inputs: { freq_mod: 'v/oct' },
      outputs: { sin: 'sin', tri: 'tri', saw: 'saw', sqr: 'sqr' }
    }
  }
}

class LowFreqOscillator extends Oscillator {
  constructor () {
    super()
    const DEFAULT_FREQ = 2
    const types = ['sine', 'triangle', 'sawtooth', 'square']

    this.tune = {
      freq: {
        range: { type: 'numeric', min: 0.5, max: 30, default: DEFAULT_FREQ },
        get: () => this.nodes[types[0]].frequency.value,
        set: (value) => {
          for (const type of types) {
            this.nodes[type].frequency.value = value
          }
        }
      }
    }

    this.labels.module = 'LFO'
  }
}

class Amplifer extends Module {
  constructor () {
    super()
    const DEFAULT_GAIN = 1

    this.nodes.gain = new GainNode(context, { gain: 1 })
    this.nodes.manualGain = new GainNode(context, { gain: DEFAULT_GAIN })
    this.nodes.gain.connect(this.nodes.manualGain)

    this.tune = {
      gain: {
        range: { type: 'numeric', min: 0, max: 2, default: DEFAULT_GAIN, step: 0.01 },
        get: () => this.nodes.manualGain.gain.value,
        set: (value) => { this.nodes.manualGain.gain.value = value }
      }
    }

    this.input = {
      signal: this.nodes.gain,
      gain: this.nodes.gain.gain
    }

    this.output = {
      signal: this.nodes.manualGain
    }

    this.labels = {
      module: 'Amplifer',
      tune: { gain: 'Gain' },
      inputs: { signal: 'in', gain: 'gain' },
      outputs: { signal: 'out' }
    }
  }
}

class Delay extends Module {
  constructor () {
    super()
    const DEFAULT_DELAY = 1

    this.nodes.delay = new DelayNode(context, { delayTime: DEFAULT_DELAY, maxDelayTime: 3 })

    this.tune = {
      delay: {
        range: { type: 'numeric', min: 0.1, max: 3, default: DEFAULT_DELAY, step: 0.01 },
        get: () => this.nodes.delay.delayTime.value,
        set: (value) => { this.nodes.delay.delayTime.value = value }
      }
    }

    this.input = {
      signal: this.nodes.delay
    }

    this.output = {
      signal: this.nodes.delay
    }

    this.labels = {
      module: 'Delay',
      tune: { delay: 'time' },
      inputs: { signal: 'in' },
      outputs: { signal: 'out' }
    }
  }
}

class SummingAmplifer extends Module {
  constructor () {
    super()
    const DEFAULT_WAYS = 4

    this.nodes.summingGain = new GainNode(context, { gain: 1 })

    this.nodes.gains = []
    for (let i = 0; i < DEFAULT_WAYS; i++) {
      const gainNode = new GainNode(context, { gain: 1 })
      gainNode.connect(this.nodes.summingGain)
      this.input[`in-${i}`] = gainNode
      this.labels.inputs[`in-${i}`] = `#${i}`
      this.nodes.gains.push(gainNode)
    }

    this.output = {
      signal: this.nodes.summingGain
    }

    this.labels.module = 'Mixer'
    this.labels.outputs = { signal: 'sum' }
  }
}

class Filter extends Module {
  constructor () {
    super()

    this.nodes.signal = new GainNode(context, { gain: 1 })
    this.nodes.detune = new GainNode(context, { gain: 6000 })

    const types = ['bandpass', 'highpass', 'lowpass']

    for (const type of types) {
      const filter = new BiquadFilterNode(context, { type: type })
      this.nodes.signal.connect(filter)
      this.nodes.detune.connect(filter.detune)
      this.nodes[type] = filter
    }

    this.tune = {
      qfactor: {
        range: { type: 'log', min: 0.0001, max: 1000, default: 1 },
        get: () => normalToLog(this.nodes[types[0]].Q.value, 0.0001, 1000),
        set: (value) => {
          for (const type of types) {
            this.nodes[type].Q.value = logToNormal(value, 0.0001, 1000)
          }
        }
      },
      freq: {
        range: { type: 'log', min: 10, max: 15000, default: 350 },
        get: () => normalToLog(this.nodes[types[0]].frequency.value, 10, 15000),
        set: (value) => {
          for (const type of types) {
            this.nodes[type].frequency.value = logToNormal(value, 10, 15000)
          }
        }
      }
    }

    this.input = {
      signal: this.nodes.signal,
      detune: this.nodes.detune
    }

    this.output = {
      bandpass: this.nodes.bandpass,
      highpass: this.nodes.highpass,
      lowpass: this.nodes.lowpass
    }

    this.labels = {
      module: 'Filter',
      tune: { qfactor: 'q-fac', freq: 'freq' },
      inputs: { signal: 'in', detune: 'freq' },
      outputs: { bandpass: 'bp', highpass: 'hp', lowpass: 'lp' }
    }
  }
}

class Output extends Module {
  constructor () {
    super()
    this.input = {
      signal: context.destination
    }

    this.labels.module = 'Output'
    this.labels.inputs = { signal: 'mono' }
  }
}
