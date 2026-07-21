export async function mockForecastApis(page) {
    const forecast = buildForecastPayload();

    await page.route('https://api.open-meteo.com/**', async (route) => {
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
                hourly: {
                    time: forecast.time,
                    temperature_2m: forecast.temperature,
                    windspeed_10m: forecast.windSpeed,
                    winddirection_10m: forecast.windDirection
                }
            })
        });
    });

    await page.route('https://marine-api.open-meteo.com/**', async (route) => {
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
                hourly: {
                    time: forecast.time,
                    swell_wave_height: forecast.swellHeight
                }
            })
        });
    });
}

function buildForecastPayload(hours = 240) {
    const start = new Date();
    start.setMinutes(0, 0, 0);

    const time = Array.from({ length: hours }, (_, index) => {
        const next = new Date(start);
        next.setHours(start.getHours() + index);
        return next.toISOString().slice(0, 16);
    });

    return {
        time,
        temperature: time.map((_, index) => 17 + Math.sin(index / 8)),
        windSpeed: time.map((_, index) => 16 + (index % 8)),
        windDirection: time.map((_, index) => (225 + index * 8) % 360),
        swellHeight: time.map((_, index) => 0.8 + (index % 6) * 0.08)
    };
}
