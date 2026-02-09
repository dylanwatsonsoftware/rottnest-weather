<script>
    import { onMount } from 'svelte';
    import { Chart, registerables } from 'chart.js';
    import ChartDataLabels from 'chartjs-plugin-datalabels';
    import annotationPlugin from 'chartjs-plugin-annotation';

    Chart.register(...registerables, ChartDataLabels, annotationPlugin);

    let { forecastData, hourIndex = $bindable(0), onSliderChange } = $props();

    let chart;
    let canvasElement;

    function getDirection(degrees) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(degrees / 45) % 8;
        return directions[index];
    }

    function getWindArrow(degrees) {
        const arrows = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘'];
        const index = Math.round(degrees / 45) % 8;
        return arrows[index];
    }

    onMount(() => {
        if (forecastData) {
            initChart();
        }
        return () => {
            if (chart) chart.destroy();
        };
    });

    function initChart() {
        if (!canvasElement) return;
        const labels = forecastData.time.map(t => new Date(t).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));

        chart = new Chart(canvasElement, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Wind Speed (km/h)',
                        data: forecastData.windspeed_10m,
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y',
                        datalabels: {
                            display: function(context) {
                                return context.dataIndex % 4 === 0;
                            },
                            formatter: function(value, context) {
                                return getWindArrow(forecastData.winddirection_10m[context.dataIndex]);
                            },
                            align: 'top',
                            offset: 5,
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            color: '#0056b3'
                        }
                    },
                    {
                        label: 'Swell Height (m)',
                        data: forecastData.swell_wave_height,
                        borderColor: '#28a745',
                        backgroundColor: 'transparent',
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y1',
                        datalabels: {
                            display: false
                        }
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 12
                        }
                    },
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Wind (km/h)',
                            font: { size: 10 },
                            color: '#007bff'
                        },
                        ticks: {
                            color: '#007bff'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        title: {
                            display: true,
                            text: 'Swell (m)',
                            font: { size: 10 },
                            color: '#28a745'
                        },
                        ticks: {
                            color: '#28a745'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y;
                                    if (context.datasetIndex === 0) {
                                        const dir = getDirection(forecastData.winddirection_10m[context.dataIndex]);
                                        const arrow = getWindArrow(forecastData.winddirection_10m[context.dataIndex]);
                                        label += ' km/h ' + dir + ' ' + arrow;
                                    } else {
                                        label += 'm';
                                    }
                                }
                                return label;
                            }
                        }
                    },
                    annotation: {
                        annotations: {
                            line1: {
                                type: 'line',
                                xMin: hourIndex,
                                xMax: hourIndex,
                                borderColor: 'red',
                                borderWidth: 2,
                            }
                        }
                    },
                    datalabels: {
                        display: false
                    }
                }
            }
        });
    }

    $effect(() => {
        if (chart && forecastData) {
            chart.options.plugins.annotation.annotations.line1.xMin = hourIndex;
            chart.options.plugins.annotation.annotations.line1.xMax = hourIndex;
            chart.update('none');
        }
    });

    $effect(() => {
        if (!chart && forecastData && canvasElement) {
            initChart();
        }
    });

    const selectedTime = $derived(forecastData ? new Date(forecastData.time[hourIndex]).toLocaleString([], {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
    }) : 'Now');

</script>

<div id="controls">
    <div class="slider-container">
        <label for="time-slider">Forecast Time: <span id="selected-time">{selectedTime}</span></label>
        <input type="range" id="time-slider" min="0" max="47" bind:value={hourIndex} oninput={onSliderChange}>
    </div>
    <div class="graph-container">
        <canvas id="forecastChart" bind:this={canvasElement}></canvas>
    </div>
</div>
