export class ApiError extends Error {
    public readonly statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
    }
}

export class SheetNotFoundError extends ApiError {
    constructor(sheetId: string) {
        super(`Sheet with ID "${sheetId}" not found.`, 404);
    }
}

export class TimerAlreadyRunningError extends ApiError {
    constructor() {
        super('A timer is already running.', 409); // 409 Conflict
    }
}

export class NoActiveTimerError extends ApiError {
    constructor() {
        super('No active timer found to stop.', 404);
    }
}

export class AuthenticationError extends ApiError {
    constructor(message: string = 'Authentication failed.') {
        super(message, 401);
    }
}

export class GoogleSheetsAPIError extends ApiError {
    constructor(message: string) {
        super(`Google Sheets API Error: ${message}`, 500);
    }
}
