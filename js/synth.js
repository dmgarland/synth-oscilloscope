const channels = { mono: 1, stereo: 2 };
const concert_pitch_hz = 440.0;
const equal_temperament_steps = 12; // ET divides an octave into twelve parts
const A = Math.pow(2, 1 / equal_temperament_steps); // Twelth root of 2 https://pages.mtu.edu/~suits/NoteFreqCalcs.html
const TAU = Math.PI * 2; // ratio between circumfrence and radius in radians

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var chart;
var max_sample = 101;

function Synth({ steps, overtones, seconds, sampleRate, harmonics }) {
    this.steps = steps;
    this.overtones = overtones;
    this.seconds = seconds;
    this.sample_rate = sampleRate;
    this.harmonics = harmonics;
}

Synth.prototype.init = function() {
    var prevSampleRate = audioCtx.sampleRate;
    audioCtx = new AudioContext({ sampleRate: this.sample_rate });
    var total_samples = audioCtx.sampleRate * this.seconds;
    this.buffer = audioCtx.createBuffer(channels.mono, total_samples, audioCtx.sampleRate);
    for (var channel = 0; channel < this.buffer.numberOfChannels; channel++) {
        var pcm_data = this.buffer.getChannelData(channel);
        this.fillBuffer(pcm_data);

        if(prevSampleRate !== audioCtx.sampleRate) {
            max_sample = findLastSampleInFirstPhase(pcm_data);
        }
        plotOscilloscope(pcm_data.slice(0, max_sample));
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



function AddSynth({ steps, overtones, seconds, sampleRate, harmonics }) {
    Synth.call(this, { steps, overtones, seconds, sampleRate, harmonics });
}

AddSynth.prototype = new Synth({});

// PCM = Pulse code modulation https://en.wikipedia.org/wiki/Pulse-code_modulation
AddSynth.prototype.fillBuffer = function(pcm_data) {
    var pulse_hz = concert_pitch_hz * Math.pow(A, this.steps);
    for(var h = 0; h < this.harmonics.length; h++) {
        var harmonic = this.harmonics[h];
        var increment = (pulse_hz * harmonic.overtone) / audioCtx.sampleRate;

        // Additive Synthesis
        for (var i = 0; i < pcm_data.length; i++) {
            pcm_data[i] += (Math.sin(harmonic.phase * TAU) / harmonic.overtone);
            harmonic.phase = (harmonic.phase + increment) % 1.0;
        }
    }
}

function FMSynth({ steps, overtones, seconds, sampleRate, mod_freq, mod_amount }) {
    Synth.call(this, { steps, seconds, sampleRate });
    this.mod_freq = mod_freq;
    this.mod_amount = mod_amount;
    this.phase = 0.0;
    this.mod_phase = 0.0;
}

FMSynth.prototype = new Synth({});
FMSynth.prototype.fillBuffer = function(pcm_data) {
    var pulse_hz = concert_pitch_hz * Math.pow(A, this.steps);
    var mod_hz = this.mod_freq;
    var mod_amount = this.mod_amount;
    var carrier_increment = pulse_hz / this.sample_rate;
    var mod_increment = mod_hz / this.sample_rate;

    // FM Synth
    for (var i = 0; i < pcm_data.length; i++) {
        pcm_data[i] = Math.sin(this.phase * TAU + mod_amount * Math.sin(TAU * this.mod_phase));
        this.phase = (this.phase + carrier_increment) % 1.0;
        this.mod_phase = (this.mod_phase + mod_increment) % 1.0;
    }
}


function update() {
    var steps = parseInt(document.getElementById('steps').value);
    var overtones = document.getElementById('overtones').value.split(",");
    var seconds = parseInt(document.getElementById('duration').value);
    var sampleRate = parseInt(document.getElementById('sample_rate').value);
    var mod_freq = parseInt(document.getElementById('mod_freq').value);
    var mod_amount = parseInt(document.getElementById('mod_amount').value);
    var harmonics = overtones.map(function(overtone) { return { overtone: parseInt(overtone), phase: 0.0 };});
    var synthMethod = document.querySelector('input[name="synth"]:checked').value;
    var synth;

    if(synthMethod === 'add') {
        synth = new AddSynth({ steps, overtones, seconds, sampleRate, harmonics });
        document.getElementById('add-fields').setAttribute("style", "display: block;");
        document.getElementById('fm-fields').setAttribute("style", "display: none;");
    }
    else {
        synth = new FMSynth({ steps, seconds, sampleRate, mod_freq, mod_amount });
        document.getElementById('add-fields').setAttribute("style", "display: none;");
        document.getElementById('fm-fields').setAttribute("style", "display: block;");
    }
    synth.init();
    synth.sound();
}

function initOscilloscope() {
    var ctx = document.getElementById('oscilloscope').getContext('2d');
    var data = {
        labels: [],
        datasets: [{
            data: []
        }]
    };
    chart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            plugins: {
                legend: {
                    display: false
                }
            },
            elements: {
                point: {
                    radius: 0
                },
                line: {
                    borderColor: '#32b832'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Samples (Time)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Amplitude'
                    }
                }
            },
            responsive: false
        }
    });
}

function findLastSampleInFirstPhase(pcm_data) {
    var negative = false;
    for(var i = 0; i < pcm_data.length; i++) {
        if(pcm_data[i] < 0) {
            negative = true;
        }
        if(negative && pcm_data[i] > 0) {
            return i;
        }
    }
}

function plotOscilloscope(pcm_data) {

    chart.data.labels = Array.from(pcm_data.keys());
    chart.data.datasets = [
        {
            data: pcm_data
        }
    ];
    chart.update();
}

initOscilloscope();
update();
