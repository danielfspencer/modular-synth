/* global context, nodes, GainNode, OscillatorNode */

class Module {
  constructor () {
    this.nodes = {}

    this.input = {}
    this.output = {}
    this.tune = {}

    this.div = document.createElement('div')
  }

  getHTMLObject () {
    this.div.className = 'module'

    let tunings = ''
    for (const tuning of Object.keys(this.tune)) {
      const currValue = Math.round(this.tune[tuning].get() * 10) / 10
      tunings += `<label for='${tuning}'>${tuning}</label>
      <input type='number' id='${tuning}' name='${tuning}' value='${currValue}' step='0.1'>`
    }

    let inputs = ''
    for (const input of Object.keys(this.input)) {
      inputs += `<div class='module-connector input' id='${input}' title='${input}'></div>`
    }

    let outputs = ''
    for (const output of Object.keys(this.output)) {
      outputs += `<div class='module-connector output' id='${output}' title='${output}'></div>`
    }

    this.div.innerHTML = `
      <div class='module-header'>${this.constructor.name}</div>
      <div class='module-io'>
        ${tunings}<hr>
        ${inputs}<hr>
        ${outputs}
      </div>`

    return this.div
  }

  attachHandlers () {
    for (const [name, funcs] of Object.entries(this.tune)) {
      const input = this.div.querySelector(`#${name}`)
      input.addEventListener('change', () => {
        if (input.validity.valid) {
          funcs.set(parseFloat(input.value))
        }
      })
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
  }
}

class Output extends Module {
  constructor () {
    super()
    this.input = {
      signal: context.destination
    }
  }
}

function connect (mod1, mod2, port1, port2) {
  console.log(`${port1} -> ${port2}`)
  mod1.output[port1].connect(mod2.input[port2])

  const elem1 = mod1.div.querySelector(`#${port1}.output`)
  const elem2 = mod2.div.querySelector(`#${port2}.input`)
  nodes.push([elem1, elem2])
}

function init () { // eslint-disable-line no-unused-vars
  const out = new Output()
  const main = new Oscillator(262)
  const lfo1 = new Oscillator(0.5)
  const lfo2 = new Oscillator(8)
  const gain1 = new Amplifer(0.1)
  const gain2 = new Amplifer(0.3)
  const outGain = new Amplifer(0.35)

  const modules = [out, main, lfo1, lfo2, gain1, gain2, outGain]
  modules.forEach((module) => {
    document.querySelector('#container').appendChild(module.getHTMLObject())
    module.attachHandlers()
  })

  connect(lfo1, gain1, 'saw', 'signal')
  connect(gain1, lfo2, 'signal', 'freq_mod')
  connect(lfo2, gain2, 'sin', 'signal')
  connect(gain2, main, 'signal', 'freq_mod')
  connect(main, outGain, 'sin', 'signal')
  connect(outGain, out, 'signal', 'signal')
}
