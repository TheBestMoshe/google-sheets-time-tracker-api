import { TimerService } from '../services/timerService';
import { z } from 'zod';
import { handleError } from '../utils/errorHandler';

const startRequestSchema = z.object({
    sheetId: z.string(),
    description: z.string().optional(),
});

const stopRequestSchema = z.object({
    sheetId: z.string(),
});

export default async function timerRoutes(req: Request, timerService: TimerService): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'POST' && url.pathname === '/timer/start') {
        try {
            const body = await req.json();
            const { sheetId, description } = startRequestSchema.parse(body);
            const result = await timerService.startTimer(sheetId, description);
            return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } catch (error) {
            return handleError(error);
        }
    }

    if (req.method === 'POST' && url.pathname === '/timer/stop') {
        try {
            const body = await req.json();
            const { sheetId } = stopRequestSchema.parse(body);
            const result = await timerService.stopTimer(sheetId);
            return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } catch (error) {
            return handleError(error);
        }
    }

    return new Response('Not Found', { status: 404 });
}
