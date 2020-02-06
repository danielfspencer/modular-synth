/* global context, connectionStart, connectionEnd, disconnectPort, GainNode, OscillatorNode */

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
      const currValue = Math.round(this.tune[tuning].get() * 10) / 10
      tunings += `<label for='${tuning}'>${this.labels.tune[tuning]}</label>
      <input type='number' id='${tuning}' name='${tuning}' value='${currValue}' step='0.1'>`
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
        ${tunings}
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
      element.addEventListener('change', (event) => {
        this._tuneableChanged(event, (value) => func.set(value))
      })
    }

    for (const name in this.output) {
      const element = this.div.querySelector(`#${name}.output`)
      element.parentNode.addEventListener('mouseup', (event) => {
        this._mouseUp(event, element, this.output[name])
      })

      element.parentNode.addEventListener('mousedown', (event) => {
        this._mouseDown(event, element, this.output[name])
      })

      element.parentNode.addEventListener('contextmenu', (event) => event.preventDefault())
    }

    for (const name in this.input) {
      const element = this.div.querySelector(`#${name}.input`)
      element.parentNode.addEventListener('mouseup', (event) => {
        this._mouseUp(event, element, this.input[name])
      })

      element.parentNode.addEventListener('mousedown', (event) => {
        this._mouseDown(event, element, this.input[name])
      })

      element.parentNode.addEventListener('contextmenu', (event) => event.preventDefault())
    }
  }

  _tuneableChanged (event, callback) {
    if (event.target.validity.valid) {
      callback(parseFloat(event.target.value))
    }
  }

  _mouseDown (event, element, node) {
    if (event.which === 3) {
      disconnectPort([element, node])
    } else {
      connectionStart([element, node])
    }
  }

  _mouseUp (event, element, node) {
    if (event.which === 3) {
      disconnectPort([element, node])
    } else {
      connectionEnd([element, node])
    }
  }
}

class Oscillator extends Module {
  constructor (freq, detune) {
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
        get: () => { return this.nodes.sine.frequency.value },
        set: (value) => {
          for (const type of types) {
            this.nodes[type].frequency.value = value
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
        get: () => { return this.nodes.manualGain.gain.value },
        set: (value) => {
          this.nodes.manualGain.gain.value = value
        }
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

class Output extends Module {
  constructor () {
    super()
    this.input = {
      signal: context.destination
    }

    this.labels = {
      inputs: { signal: 'mono' }
    }
  }
}

function init () { // eslint-disable-line no-unused-vars
  const out = new Output()
  const main = new Oscillator(262)
  const lfo1 = new Oscillator(0.5)
  const lfo2 = new Oscillator(8)
  const gain1 = new Amplifer(0.1)
  const gain2 = new Amplifer(0.3)
  const outGain = new Amplifer(0.35)
  const another = new Amplifer(0.2)
  const another2 = new Amplifer(0.2)
  const summer = new SummingAmplifer(4)

  const modules = [summer, out, main, lfo1, lfo2, gain1, gain2, outGain, another, another2]
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
