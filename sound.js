class Module {
  constructor() {
    this.nodes = {}

    this.input = {}
    this.output = {}
    this.tune = {}

    this.div = document.createElement('div')
  }

  getHTMLObject() {
    this.div.className = 'module'

    let tunings = ''
    for (let tuning of Object.keys(this.tune)) {
      let currValue = Math.round(this.tune[tuning].get() * 10) / 10
      tunings += `<label for='${tuning}'>${tuning}</label>
      <input type='number' id='${tuning}' name='${tuning}' value='${currValue}' step='0.1'>`
    }

    let inputs = ''
    for (let input of Object.keys(this.input)) {
      inputs += `<div class='module-connector input' id='${input}' title='${input}'></div>`
    }

    let outputs = ''
    for (let output of Object.keys(this.output)) {
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

  attachHandlers() {
    for (let [name, funcs] of Object.entries(this.tune)) {
      let input = this.div.querySelector(`#${name}`)
      input.addEventListener('change', () => {
        if (input.validity.valid) {
          funcs.set(parseFloat(input.value))
        }
      })
    }
  }
}

class Oscillator extends Module {
  constructor(freq, detune) {
    super()

    this.nodes.detune = context.createGain()
    this.nodes.detune.gain.value = 6000

    const types = ['sine', 'triangle', 'sawtooth', 'square']
    for (let type of types) {
      this.nodes[type] = context.createOscillator()
      this.nodes[type].type = type
      this.nodes[type].frequency.value = freq
      this.nodes.detune.connect(this.nodes[type].detune)
      this.nodes[type].start()
    }

    this.tune = {
      freq: {
        get: () => { return this.nodes.sine.frequency.value },
        set: (value) => {
          for (let type of types) {
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
  constructor(gain) {
    super()
    this.nodes.gain = context.createGain()
    this.nodes.gain.gain.value = 1

    this.nodes.manualGain = context.createGain()
    this.nodes.manualGain.gain.value = gain

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
  constructor() {
    super()
    this.input = {
      signal: context.destination
    }
  }
}

function connect (mod1, mod2, port1, port2) {
  console.log(`${port1} -> ${port2}`)
  mod1.output[port1].connect(mod2.input[port2])


  let elem1 = mod1.div.querySelector(`#${port1}.output`)
  let elem2 = mod2.div.querySelector(`#${port2}.input`)
  nodes.push([elem1, elem2])
}


function init () {
  context = new AudioContext()

  let out = new Output()
  let main = new Oscillator(262)
  let lfo1 = new Oscillator(0.5)
  let lfo2 = new Oscillator(8)
  let gain1 = new Amplifer(0.1)
  let gain2 = new Amplifer(0.3)
  let out_gain = new Amplifer(0.35)

  let modules = [out, main, lfo1, lfo2, gain1, gain2, out_gain]
  modules.forEach((module) => {
    document.querySelector('#container').appendChild(module.getHTMLObject())
    module.attachHandlers()
  })

  connect(lfo1, gain1, 'saw', 'signal')
  connect(gain1, lfo2, 'signal', 'freq_mod')
  connect(lfo2, gain2, 'sin', 'signal')
  connect(gain2, main, 'signal', 'freq_mod')
  connect(main, out_gain, 'sin', 'signal')
  connect(out_gain, out, 'signal', 'signal')
}
