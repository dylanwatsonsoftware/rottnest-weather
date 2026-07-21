import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/responsive',
    webServer: {
        command: 'fnm exec --using=22 npm run preview -- --host 127.0.0.1 --port 4273',
        url: 'http://127.0.0.1:4273',
        reuseExistingServer: true,
        timeout: 120000
    },
    use: {
        baseURL: 'http://127.0.0.1:4273',
        screenshot: 'only-on-failure'
    }
});
