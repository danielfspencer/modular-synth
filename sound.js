class Module {
  constructor() {
    this.nodes = {}

    this.input = {}
    this.output = {}
    this.tune = {}
  }

  getHTMLObject() {
    const div = document.createElement('div')
    div.className = 'module'

    let tunings = ''
    for (let tuning of Object.keys(this.tune)) {
      let currValue = this.tune[tuning].get()
      tunings += `<label for='${name}-${tuning}'>${tuning}</label>
      <input type='number' id='${name}-${tuning}' name='${name}-${tuning}' value='${currValue}'>`
    }

    let inputs = ''
    for (let input of Object.keys(this.input)) {
      inputs += `<div class='module-connector input' title='${input}'></div>`
    }

    let outputs = ''
    for (let output of Object.keys(this.output)) {
      outputs += `<div class='module-connector output' title='${output}'></div>`
    }

    div.innerHTML = `
      <div class='module-header'>${this.constructor.name}</div>
      <div class='module-io'>
        ${tunings}<hr>
        ${inputs}<hr>
        ${outputs}
      </div>`

    return div
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

    this.input = {
      freq_mod: this.nodes.detune
    }

    this.output = {
      sin: this.nodes.sine,
      tri: this.nodes.triangle,
      saw: this.nodes.sawtooth,
      sqr: this.nodes.square
    }

    this.tune = {
      freq: {
        get: () => { return this.nodes.sine.frequency.value },
        set: (freq) => {
          for (let type of types) {
            this.nodes[type].frequency.value = freq
          }
        }
      }
    }
  }
}

class Amplifer extends Module {
  constructor(gain) {
    super()
    this.nodes.gain = context.createGain()
    this.nodes.gain.gain.value = gain

    this.input = {
      signal: this.nodes.gain,
      gain: this.nodes.gain.gain
    }

    this.output = {
      signal: this.nodes.gain
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


function init () {
  context = new AudioContext()

  let out = new Output()

  let main = new Oscillator(330)

  let lfo1 = new Oscillator(0.5)
  let lfo2 = new Oscillator(8)

  let gain1 = new Amplifer(0.1)
  let gain2 = new Amplifer(0.3)

  let out_gain = new Amplifer(0.3)

  lfo1.output.sin.connect(gain1.input.signal)
  gain1.output.signal.connect(lfo2.input.freq_mod)

  lfo2.output.saw.connect(gain2.input.signal)
  gain2.output.signal.connect(main.input.freq_mod)

  main.output.sin.connect(out_gain.input.signal)
  out_gain.output.signal.connect(out.input.signal)

  let modules = [out, main, lfo1, lfo2, gain1, gain2, out_gain]

  modules.forEach((module) => {
    document.querySelector('#container').appendChild(module.getHTMLObject())
  })
}
