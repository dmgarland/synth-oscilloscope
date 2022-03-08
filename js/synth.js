const channels = { mono: 1, stereo: 2 };
const concert_pitch_hz = 440.0;
const equal_temperament_steps = 12; // ET divides an octave into twelve parts
const A = Math.pow(2, 1 / equal_temperament_steps); // Twelth root of 2 https://pages.mtu.edu/~suits/NoteFreqCalcs.html
const TAU = Math.PI * 2; // ratio between circumfrence and radius in radians

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function Synth({ freq_hz, steps, overtones, seconds, sampleRate, harmonics, sampleRateChanged }) {
    this.freq_hz = freq_hz;
    this.steps = steps;
    this.overtones = overtones;
    this.seconds = seconds;
    this.sample_rate = sampleRate;
    this.harmonics = harmonics;
    this.sampleRateChanged = sampleRateChanged;
}

Synth.prototype.init = function() {
    var prevSampleRate = audioCtx.sampleRate;
    audioCtx = new AudioContext({ sampleRate: this.sample_rate });
    var total_samples = audioCtx.sampleRate * this.seconds;
    this.buffer = audioCtx.createBuffer(channels.mono, total_samples, audioCtx.sampleRate);
    for (var channel = 0; channel < this.buffer.numberOfChannels; channel++) {
        var pcm_data = this.buffer.getChannelData(channel);
        this.fillBuffer(pcm_data);

        if(prevSampleRate !== audioCtx.sampleRate) this.sampleRateChanged(pcm_data);
    }
}

Synth.prototype.sound = function() {
    // Get an AudioBufferSourceNode.
    // This is the AudioNode to use when we want to play an AudioBuffer
    var source = audioCtx.createBufferSource();

    // set the buffer in the AudioBufferSourceNode
    source.buffer = this.buffer;

    // connect the AudioBufferSourceNode to the
    // destination so we can hear the sound
    source.connect(audioCtx.destination);

    // start the source playing
    source.start();
}

function AddSynth({ freq_hz, steps, overtones, seconds, sampleRate, harmonics, sampleRateChanged }) {
    Synth.call(this, { freq_hz, steps, overtones, seconds, sampleRate, harmonics, sampleRateChanged });
}

AddSynth.prototype = new Synth({});

// PCM = Pulse code modulation https://en.wikipedia.org/wiki/Pulse-code_modulation
AddSynth.prototype.fillBuffer = function(pcm_data) {
    if(!this.freq_hz) this.freq_hz = concert_pitch_hz * Math.pow(A, this.steps);
    for(var h = 0; h < this.harmonics.length; h++) {
        var harmonic = this.harmonics[h];
        var increment = (this.freq_hz * harmonic.overtone) / audioCtx.sampleRate;

        // Additive Synthesis
        for (var i = 0; i < pcm_data.length; i++) {
            pcm_data[i] += (Math.sin(harmonic.phase * TAU) / harmonic.overtone);
            harmonic.phase = (harmonic.phase + increment) % 1.0;
        }
    }
}

function FMSynth({ steps, overtones, seconds, sampleRate, mod_freq, mod_amount, sampleRateChanged }) {
    Synth.call(this, { steps, seconds, sampleRate, sampleRateChanged });
    this.mod_freq = mod_freq;
    this.mod_amount = mod_amount;
    this.phase = 0.0;
    this.mod_phase = 0.0;
}

FMSynth.prototype = new Synth({});
FMSynth.prototype.fillBuffer = function(pcm_data) {
    var pulse_hz = concert_pitch_hz * Math.pow(A, this.steps);
    var carrier_increment = pulse_hz / this.sample_rate;
    var mod_increment = this.mod_freq / this.sample_rate;

    // FM Synth
    for (var i = 0; i < pcm_data.length; i++) {
        pcm_data[i] = Math.sin(this.phase * TAU + this.mod_amount * Math.sin(TAU * this.mod_phase));
        this.phase = (this.phase + carrier_increment) % 1.0;
        this.mod_phase = (this.mod_phase + mod_increment) % 1.0;
    }
}


