import { ApiError } from './errors';
import logger from './logger';

export function handleError(error: Error): Response {
    if (error instanceof ApiError) {
        logger.warn(`API Error: ${error.message}`);
        return new Response(JSON.stringify({ error: error.message }), { status: error.statusCode, headers: { 'Content-Type': 'application/json' } });
    }

    logger.error('An unexpected error occurred:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
}
