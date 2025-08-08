import { GoogleSheetsService } from './services/googleSheets';
import { TimerService } from './services/timerService';
import timerRoutes from './routes/timer';

import logger from './utils/logger';

async function main() {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        logger.error('FATAL ERROR: GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set.');
        process.exit(1);
    }

    const googleSheetsService = new GoogleSheetsService();
    await googleSheetsService.authenticate();

    const timerService = new TimerService(googleSheetsService);

    const port = process.env.PORT || 3000;

    Bun.serve({
        port,
        async fetch(req) {
            const url = new URL(req.url);
            if (url.pathname.startsWith('/timer')) {
                return timerRoutes(req, timerService);
            }
            if (url.pathname === '/health') {
                try {
                    await googleSheetsService.checkConnection();
                    return new Response(JSON.stringify({ status: 'OK', message: 'Google Sheets API connection is healthy.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
                } catch (error) {
                    console.error('Health check failed:', error);
                    return new Response(JSON.stringify({ status: 'ERROR', message: 'Could not connect to Google Sheets API.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
                }
            }
            return new Response('Not Found', { status: 404 });
        },
    });

    console.log(`Server running at http://localhost:${port}`);
}

main();