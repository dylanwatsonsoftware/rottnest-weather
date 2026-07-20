<script>
    import { onMount } from 'svelte';
    import { Chart, registerables } from 'chart.js';
    import ChartDataLabels from 'chartjs-plugin-datalabels';
    import annotationPlugin from 'chartjs-plugin-annotation';
    import { getForecastChartDensity, getForecastChartLabels, getRangeModeLabel, RANGE_MODES } from './panelState.js';

    Chart.register(...registerables, ChartDataLabels, annotationPlugin);

    let {
        forecastData,
        forecastRange = { min: 0, max: 0 },
        rangeMode = 'today',
        hourIndex = $bindable(0),
        sliderHeatGradient = '#dbe5e5',
        onSliderChange,
        onRangeModeChange = () => {}
    } = $props();

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
        const chartData = getChartData();
        const density = chartData.density;

        chart = new Chart(canvasElement, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [
                    {
                        label: 'Wind Speed (km/h)',
                        data: chartData.windSpeed,
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: density.pointRadius,
                        pointHoverRadius: Math.max(density.pointRadius + 2, 4),
                        yAxisID: 'y',
                        datalabels: {
                            display: function(context) {
                                return context.dataIndex % density.windArrowEvery === 0;
                            },
                            formatter: function(value, context) {
                                return getWindArrow(forecastData.winddirection_10m[forecastRange.min + context.dataIndex]);
                            },
                            align: 'top',
                            offset: 5,
                            font: {
                                size: density.windArrowSize,
                                weight: 'bold'
                            },
                            color: '#0056b3'
                        }
                    },
                    {
                        label: 'Swell Height (m)',
                        data: chartData.swellHeight,
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
                            maxTicksLimit: density.maxTicksLimit
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
                                        const absoluteIndex = forecastRange.min + context.dataIndex;
                                        const dir = getDirection(forecastData.winddirection_10m[absoluteIndex]);
                                        const arrow = getWindArrow(forecastData.winddirection_10m[absoluteIndex]);
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
                                xMin: getChartHourIndex(),
                                xMax: getChartHourIndex(),
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

    function getChartData() {
        const start = forecastRange.min;
        const end = forecastRange.max + 1;

        return {
            labels: getForecastChartLabels(forecastData.time, forecastRange, rangeMode),
            windSpeed: forecastData.windspeed_10m?.slice(start, end) || [],
            windDirection: forecastData.winddirection_10m?.slice(start, end) || [],
            swellHeight: forecastData.swell_wave_height?.slice(start, end) || [],
            density: getForecastChartDensity(rangeMode, forecastRange)
        };
    }

    function getChartHourIndex() {
        return Math.max(0, Math.min(hourIndex - forecastRange.min, forecastRange.max - forecastRange.min));
    }

    function updateChartData() {
        if (!chart || !forecastData) return;
        const chartData = getChartData();
        chart.data.labels = chartData.labels;
        chart.data.datasets[0].data = chartData.windSpeed;
        chart.data.datasets[1].data = chartData.swellHeight;
        chart.data.datasets[0].pointRadius = chartData.density.pointRadius;
        chart.data.datasets[0].pointHoverRadius = Math.max(chartData.density.pointRadius + 2, 4);
        chart.data.datasets[0].datalabels.display = function(context) {
            return context.dataIndex % chartData.density.windArrowEvery === 0;
        };
        chart.data.datasets[0].datalabels.font.size = chartData.density.windArrowSize;
        chart.options.scales.x.ticks.maxTicksLimit = chartData.density.maxTicksLimit;
        chart.options.plugins.annotation.annotations.line1.xMin = getChartHourIndex();
        chart.options.plugins.annotation.annotations.line1.xMax = getChartHourIndex();
        chart.update('none');
    }

    $effect(() => {
        if (chart && forecastData) {
            updateChartData();
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
        <div class="range-mode-toggle" aria-label="Forecast range">
            {#each RANGE_MODES as mode}
                <button
                    type="button"
                    class:active={rangeMode === mode}
                    onclick={() => onRangeModeChange(mode)}
                >
                    {getRangeModeLabel(mode)}
                </button>
            {/each}
        </div>
        <label for="time-slider">Forecast Time: <span id="selected-time">{selectedTime}</span></label>
        <input
            type="range"
            id="time-slider"
            style:--slider-heat={sliderHeatGradient}
            min={forecastRange.min}
            max={forecastRange.max}
            bind:value={hourIndex}
            oninput={onSliderChange}
        >
    </div>
    <div class="graph-container">
        <canvas id="forecastChart" bind:this={canvasElement}></canvas>
    </div>
</div>
