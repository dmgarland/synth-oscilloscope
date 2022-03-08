var chart;
var max_sample = 101;

function update(mute) {
    var freq_hz = parseInt(document.getElementById('freq').value);
    if(document.getElementById('series')) {
        freq_hz = freq_hz * parseInt(document.getElementById('series').value);
    }
    var steps = parseInt(document.getElementById('steps').value);
    var overtones = document.getElementById('overtones').value.split(",");
    var seconds = parseInt(document.getElementById('duration').value);
    var sampleRate = parseInt(document.getElementById('sample_rate').value);
    var mod_freq = parseInt(document.getElementById('mod_freq').value);
    var mod_amount = parseInt(document.getElementById('mod_amount').value);
    var harmonics = overtones.map(function(overtone) { return { overtone: parseInt(overtone), phase: 0.0 };});
    var synthMethod = document.querySelector('input[name="synth"]:checked').value;
    var synth;

    var sampleRateChanged = function(pcm_data) {
        max_sample = findLastSampleInFirstPhase(pcm_data);
    };

    if(synthMethod === 'add') {
        synth = new AddSynth({ freq_hz, steps, overtones, seconds, sampleRate, harmonics, sampleRateChanged });
        document.getElementById('add-fields').setAttribute("style", "display: block;");
        document.getElementById('fm-fields').setAttribute("style", "display: none;");
    }
    else {
        synth = new FMSynth({ steps, seconds, sampleRate, mod_freq, mod_amount, sampleRateChanged });
        document.getElementById('add-fields').setAttribute("style", "display: none;");
        document.getElementById('fm-fields').setAttribute("style", "display: block;");
    }
    synth.init();

    plotOscilloscope(synth.buffer.getChannelData(0).slice(0, max_sample));
    if(!mute) synth.sound();
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
update(true);
