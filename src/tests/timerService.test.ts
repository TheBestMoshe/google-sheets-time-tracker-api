import { expect, test, mock, spyOn } from 'bun:test';
import { TimerService } from '../services/timerService';
import { GoogleSheetsService } from '../services/googleSheets';

// Create a mock instance of GoogleSheetsService
const mockGoogleSheetsService = {
    getWorksheets: async (sheetId: string) => ['2025-01-01'],
    getWorksheetData: async (sheetId: string, worksheetName: string, range: string) => [],
    appendRow: async (sheetId: string, worksheetName: string, values: any[]) => {},
    createWorksheet: async (sheetId: string, title: string) => ({ sheetId: 1, title }),
    updateCell: async (sheetId: string, worksheetName: string, cell: string, value: any) => {},
    batchUpdate: async (sheetId: string, requests: any[]) => {},
    authenticate: async () => {},
    getSpreadsheet: async (sheetId: string) => ({}),
} as unknown as GoogleSheetsService;


test('startTimer should start a new timer', async () => {
    const timerService = new TimerService(mockGoogleSheetsService);

    const result = await timerService.startTimer('test-sheet-id');

    expect(result).toHaveProperty('sheet');
    expect(result).toHaveProperty('start');
});

test('startTimer should throw an error if a timer is already running', async () => {
    const mockGoogleSheetsServiceWithRunningTimer = {
        ...mockGoogleSheetsService,
        getWorksheetData: async (sheetId: string, worksheetName: string, range: string) => [['2025-01-01', '09:00:00']],
    };
    const timerService = new TimerService(mockGoogleSheetsServiceWithRunningTimer as unknown as GoogleSheetsService);

    await expect(timerService.startTimer('test-sheet-id')).rejects.toThrow('A timer is already running.');
});

test('stopTimer should stop a running timer', async () => {
    const mockGoogleSheetsServiceWithRunningTimer = {
        ...mockGoogleSheetsService,
        getWorksheetData: async (sheetId: string, worksheetName: string, range: string) => [['2025-01-01', '09:00:00']],
    };
    const timerService = new TimerService(mockGoogleSheetsServiceWithRunningTimer as unknown as GoogleSheetsService);

    const result = await timerService.stopTimer('test-sheet-id');

    expect(result).toHaveProperty('sheet');
    expect(result).toHaveProperty('end');
});

test('stopTimer should throw an error if no timer is running', async () => {
    const timerService = new TimerService(mockGoogleSheetsService);

    await expect(timerService.stopTimer('test-sheet-id')).rejects.toThrow('No active timer found to stop.');
});

test('stopTimer should return the correct duration', async () => {
    const mockGoogleSheetsServiceWithRunningTimer = {
        ...mockGoogleSheetsService,
        getWorksheetData: async (sheetId: string, worksheetName: string, range: string) => [['2025-01-01', '09:00:00']],
    };
    const timerService = new TimerService(mockGoogleSheetsServiceWithRunningTimer as unknown as GoogleSheetsService);

    const endTime = new Date('2025-01-01T10:15:30Z');
    const result = await timerService.stopTimer('test-sheet-id', endTime);

    expect(result.duration).toBe('01:15:30');
});
