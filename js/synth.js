var channels = {
    mono: 1,
    stereo: 2
}

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

var seconds = 1;
var total_samples = audioCtx.sampleRate * seconds;
var ref_freq = 440.0; // concert pitch 440 cycles (hertz) per second
var A = Math.pow(2, 1 / 12); // equal temperament
var steps = 0; // how many ET semitones away from concert pitch?
var TAU = Math.PI * 2; // ratio between circumfrence and radius
var chart;
var harmonics = [];

function update() {
    steps = document.getElementById('steps').value;
    overtones = document.getElementById('overtones').value.split(",");
    harmonics = overtones.map(function(overtone) { return { overtone: parseInt(overtone), phase: 0.0 };});

    var buffer = audioCtx.createBuffer(channels.mono, total_samples, audioCtx.sampleRate);
    for (var channel = 0; channel < buffer.numberOfChannels; channel++) {
        fillBuffer(buffer.getChannelData(channel));
        plotOscilloscope(buffer.getChannelData(channel).slice(0, 101));
    }
    sound(buffer);
}


// PCM = Pulse code modulation https://en.wikipedia.org/wiki/Pulse-code_modulation
function fillBuffer(pcm_data) {
    var pulse_hz = ref_freq * Math.pow(A, steps);
    for(var h = 0; h < harmonics.length; h++) {
        var harmonic = harmonics[h];

        var increment = (pulse_hz * harmonic.overtone) / audioCtx.sampleRate;

        for (var i = 0; i < pcm_data.length; i++) {
            pcm_data[i] += (Math.sin(harmonic.phase * TAU) / harmonic.overtone);
            harmonic.phase = (harmonic.phase + increment) % 1.0;
        }
    }
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

function plotOscilloscope(pcm_data) {
    chart.data.labels = Array.from(pcm_data.keys());
    chart.data.datasets = [
        {
            data: pcm_data
        }
    ]
    chart.update()
}

function sound(buffer) {
    // Get an AudioBufferSourceNode.
    // This is the AudioNode to use when we want to play an AudioBuffer
    var source = audioCtx.createBufferSource();

    // set the buffer in the AudioBufferSourceNode
    source.buffer = buffer;

    // connect the AudioBufferSourceNode to the
    // destination so we can hear the sound
    source.connect(audioCtx.destination);

    // start the source playing
    source.start();
}

initOscilloscope();
update();
