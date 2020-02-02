class Module {
  constructor() {
    this.input = {}
    this.output = {}
  }
}

class Oscillator extends Module {
  constructor(type, freq, detune) {
    super()
    this.node = context.createOscillator()
    this.node.type = type
    this.node.frequency.value = freq
    this.node.detune.value = detune

    this.input = {
      freq_mod: this.node.detune
    }

    this.output = {
      sine: {connect: (dest) => {this.node.connect(dest)}}
    }
    this.node.start()
  }
}

class Amplifer extends Module {
  constructor(gain) {
    super()
    this.node = context.createGain()
    this.node.gain.value = gain

    this.input = {
      signal: this.node,
      gain: this.node.gain
    }

    this.output = {
      signal: {connect: (dest) => {this.node.connect(dest)}}
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
  let sin = new Oscillator("sine", 330, 0)
  let gain = new Amplifer(0.5)

  let gain2 = new Amplifer(100)

  let mod = new Oscillator("saw", 2, 0)

  mod.output.sine.connect(gain.input.gain)
  mod.output.sine.connect(gain2.input.signal)

  gain2.output.signal.connect(sin.input.freq_mod)

  sin.output.sine.connect(gain.input.signal)
  gain.output.signal.connect(out.input.signal)


  // osctest = new osc("sine",400,0);
  // osctest.play(context.destination , 1);
  //
  // osctest2 = new osc("sine", 10, 0);
  // osctest2.play(osctest.oscillator.detune , 100);
}
