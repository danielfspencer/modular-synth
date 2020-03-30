/* global context, connectionStart, connectionEnd, disconnectPort, GainNode, OscillatorNode,
BiquadFilterNode, LOG_SLIDER_MIN, LOG_SLIDER_MAX, normalToLog, logToNormal */

class Module {
  constructor () {
    this.nodes = {}

    this.input = {}
    this.output = {}
    this.tune = {}

    this.div = document.createElement('div')
    this.labels = { tune: {}, inputs: {}, outputs: {} }
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
            console.log([tune.range.default, tune.range.min, tune.range.max])
            const initial = normalToLog(tune.range.default, tune.range.min, tune.range.max)
            range = `min='${LOG_SLIDER_MIN}' max='${LOG_SLIDER_MAX}' value='${initial}' step='1'`
          } break
          default:
            range = `min='${tune.range.min}' max='${tune.range.max}' step='${tune.range.step}'`
            break
        }
        tunings += `<input type='range' id='${tuning}' name='${tuning}' ${range}>`
      } else {
        tunings += `<input type='number' id='${tuning}' name='${tuning}' value='${currValue}' step='0.1'>`
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

    this.div.innerHTML = `
      <div class='module-header'>${this.constructor.name}</div>
      <div class='module-body'>
        <div class='module-tuning'>
          ${tunings}
        </div>
        ${(inputs !== '' && outputs !== '') ? '<hr>' : ''}
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
        element.parentNode.classList.toggle('open')
      })
    }

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
  }
}

class Oscillator extends Module {
  constructor (freq) {
    super()
    this.nodes.detune = new GainNode(context, { gain: 6000 })

    const types = ['sine', 'triangle', 'sawtooth', 'square']
    for (const type of types) {
      const oscillator = new OscillatorNode(context, {
        type: type,
        frequency: freq
      })
      this.nodes.detune.connect(oscillator.detune)
      oscillator.start()
      this.nodes[type] = oscillator
    }

    this.tune = {
      freq: {
        range: { type: 'log', min: 50, max: 12000, default: freq },
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
      tune: { freq: 'Freq.' },
      inputs: { freq_mod: 'v/oct' },
      outputs: { sin: 'sin', tri: 'tri', saw: 'saw', sqr: 'sqr' }
    }
  }
}

class Amplifer extends Module {
  constructor (gain) {
    super()
    this.nodes.gain = new GainNode(context, { gain: 1 })
    this.nodes.manualGain = new GainNode(context, { gain: gain })
    this.nodes.gain.connect(this.nodes.manualGain)

    this.tune = {
      gain: {
        range: { type: 'numeric', min: 0, max: 2, default: gain, step: 0.01 },
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
      tune: { gain: 'Gain' },
      inputs: { signal: 'in', gain: 'gain' },
      outputs: { signal: 'out' }
    }
  }
}

class SummingAmplifer extends Module {
  constructor (ways) {
    super()
    this.nodes.summingGain = new GainNode(context, { gain: 1 })

    this.nodes.gains = []
    for (let i = 0; i < ways; i++) {
      const gainNode = new GainNode(context, { gain: 1 })
      gainNode.connect(this.nodes.summingGain)
      this.input[`in-${i}`] = gainNode
      this.labels.inputs[`in-${i}`] = `#${i}`
      this.nodes.gains.push(gainNode)
    }

    this.output = {
      signal: this.nodes.summingGain
    }

    this.labels.outputs = { signal: 'sum' }
  }
}

class Filter extends Module {
  constructor (type) {
    super()
    this.nodes.filter = new BiquadFilterNode(context, { type: type })

    this.tune = {
      qfactor: {
        range: { type: 'log', min: 0.0001, max: 1000, default: 1 },
        get: () => normalToLog(this.nodes.filter.Q.value, 0.0001, 1000),
        set: (value) => { this.nodes.filter.Q.value = logToNormal(value, 0.0001, 1000) }
      },
      freq: {
        range: { type: 'log', min: 10, max: 15000, default: 350 },
        get: () => normalToLog(this.nodes.filter.frequency.value, 10, 15000),
        set: (value) => { this.nodes.filter.frequency.value = logToNormal(value, 10, 15000) }
      }
    }

    this.input = {
      signal: this.nodes.filter,
      detune: this.nodes.filter.detune
    }

    this.output = {
      signal: this.nodes.filter
    }

    this.labels = {
      tune: { qfactor: 'q', freq: 'freq' },
      inputs: { signal: 'in', detune: 'freq' },
      outputs: { signal: 'out' }
    }
  }
}

class Output extends Module {
  constructor () {
    super()
    this.input = {
      signal: context.destination
    }

    this.labels.inputs = { signal: 'mono' }
  }
}

function init () { // eslint-disable-line no-unused-vars
  // const out = new Output()
  // const main = new Oscillator(262)
  // const lfo1 = new Oscillator(0.5)
  // const lfo2 = new Oscillator(8)
  // const gain1 = new Amplifer(0.1)
  // const gain2 = new Amplifer(0.3)
  // const outGain = new Amplifer(0.35)
  // const another = new Amplifer(0.2)
  // const another2 = new Amplifer(0.2)
  // const summer = new SummingAmplifer(4)
  //
  // const modules = [summer, out, main, lfo1, lfo2, gain1, gain2, outGain, another, another2]

  const modules = []
  modules.push(new Output())
  modules.push(new Oscillator(262))
  modules.push(new Oscillator(2))
  modules.push(new Amplifer(1))
  modules.push(new Amplifer(0.1))
  modules.push(new SummingAmplifer(4))
  modules.push(new Filter('bandpass'))

  modules.forEach((module) => {
    document.querySelector('#container').appendChild(module.getHTMLObject())
    module.attachHandlers()
  })

  // connect(lfo1, gain1, 'saw', 'signal')
  // connect(gain1, lfo2, 'signal', 'freq_mod')
  // connect(lfo2, gain2, 'sin', 'signal')
  // connect(gain2, main, 'signal', 'freq_mod')
  // connect(main, outGain, 'sin', 'signal')
  // connect(outGain, out, 'signal', 'signal')
}
