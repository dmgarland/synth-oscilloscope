var channels = {
    mono: 1,
    stereo: 2
}

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

var seconds = 1;
var total_samples = audioCtx.sampleRate * seconds;
var myArrayBuffer = audioCtx.createBuffer(channels.mono, total_samples, audioCtx.sampleRate);
console.log(audioCtx.sampleRate);

var ref_freq = 440.0; // concert pitch 440 cycles (hertz) per second
var A = Math.pow(1 / 12, 2); // equal temperament
var steps = 0; // how many ET semitones away from concert pitch?
var pulse_hz = ref_freq * Math.pow(A, steps);
var increment = pulse_hz / audioCtx.sampleRate;
var phase = 0.0; // How far along the wave we are?
var TAU = Math.PI * 2; // ratio between circumfrence and radius

for (var channel = 0; channel < myArrayBuffer.numberOfChannels; channel++) {
    fillBuffer(myArrayBuffer.getChannelData(channel));
    plotOscilloscope(myArrayBuffer.getChannelData(channel).slice(0, 1000));
}

// PCM = Pulse code modulation https://en.wikipedia.org/wiki/Pulse-code_modulation
function fillBuffer(pcm_data) {
    for (var i = 0; i < pcm_data.length; i++) {
        pcm_data[i] = Math.sin(phase * TAU);
        phase = (phase + increment) % 1.0;
    }
}

function plotOscilloscope(pcm_data) {
    var ctx = document.getElementById('oscilloscope').getContext('2d');
    var labels = Array.from(pcm_data.keys());
    var data = {
        labels: labels,
        datasets: [{
            data: pcm_data
        }]
    };
    var chart = new Chart(ctx, {
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
            }
        }
    });
}

// Get an AudioBufferSourceNode.
// This is the AudioNode to use when we want to play an AudioBuffer
var source = audioCtx.createBufferSource();

// set the buffer in the AudioBufferSourceNode
source.buffer = myArrayBuffer;

// connect the AudioBufferSourceNode to the
// destination so we can hear the sound
source.connect(audioCtx.destination);

// start the source playing
source.start();
