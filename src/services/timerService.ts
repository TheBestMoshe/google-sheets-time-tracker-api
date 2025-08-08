import { GoogleSheetsService } from './googleSheets';
import { TimerAlreadyRunningError, NoActiveTimerError } from '../utils/errors';

export class TimerService {
    private googleSheetsService: GoogleSheetsService;
    private configCache: { [sheetId: string]: { config: any, timestamp: number } } = {};
    private cacheTTL = 5 * 60 * 1000; // 5 minutes

    constructor(googleSheetsService: GoogleSheetsService) {
        this.googleSheetsService = googleSheetsService;
    }

    async startTimer(sheetId: string, description?: string) {
        let currentSheet = await this.getCurrentSheet(sheetId);
        if (!currentSheet) {
            currentSheet = await this.createNewTimeSheet(sheetId);
        }

        const timerRunning = await this.isTimerRunning(sheetId, currentSheet);
        if (timerRunning) {
            throw new TimerAlreadyRunningError();
        }

        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0];
        const row = [date, time]; // Date, Start

        await this.googleSheetsService.appendRow(sheetId, currentSheet, row);

        return {
            sheet: currentSheet,
            date,
            start: time,
        };
    }

    async stopTimer(sheetId: string, endTime = new Date()) {
        const currentSheet = await this.getCurrentSheet(sheetId);
        if (!currentSheet) {
            throw new NoActiveTimerError();
        }

        const activeTimer = await this.findActiveTimerRow(sheetId, currentSheet);
        if (!activeTimer) {
            throw new NoActiveTimerError();
        }

        const endTimeString = endTime.toTimeString().split(' ')[0];
        const cell = `C${activeTimer.index}`;

        await this.googleSheetsService.updateCell(sheetId, currentSheet, cell, endTimeString);

        const startTime = activeTimer.row[1];
        const [startHours, startMinutes, startSeconds] = startTime.split(':').map(Number);
        const [endHours, endMinutes, endSeconds] = endTimeString.split(':').map(Number);

        const startDate = new Date(0, 0, 0, startHours, startMinutes, startSeconds);
        const endDate = new Date(0, 0, 0, endHours, endMinutes, endSeconds);
        const durationMs = endDate.getTime() - startDate.getTime();

        const seconds = Math.floor((durationMs / 1000) % 60);
        const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
        const hours = Math.floor((durationMs / (1000 * 60 * 60)));

        const duration = [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            seconds.toString().padStart(2, '0'),
        ].join(':');

        return {
            sheet: currentSheet,
            end: endTime,
            duration,
        };
    }

    private async findActiveTimerRow(sheetId: string, worksheetName: string): Promise<{ row: any[], index: number } | null> {
        const data = await this.googleSheetsService.getWorksheetData(sheetId, worksheetName, 'A6:C');
        if (!data || data.length === 0) {
            return null;
        }

        const lastRowIndex = data.length - 1;
        const lastRow = data[lastRowIndex];
        const hasStartTime = lastRow[1] && lastRow[1] !== '';
        const hasEndTime = lastRow[2] && lastRow[2] !== '';

        if (hasStartTime && !hasEndTime) {
            return { row: lastRow, index: lastRowIndex + 6 };
        }

        return null;
    }

    async getCurrentSheet(sheetId: string): Promise<string | null> {
        const worksheets = await this.googleSheetsService.getWorksheets(sheetId);
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const sortedSheets = worksheets
            .filter(name => dateRegex.test(name))
            .sort((a, b) => b.localeCompare(a)); // Sort descending

        for (const sheetName of sortedSheets) {
            const invoicedData = await this.googleSheetsService.getWorksheetData(sheetId, sheetName, 'A1');
            if (!invoicedData || !invoicedData[0] || invoicedData[0][0] !== 'TRUE') {
                return sheetName;
            }
        }

        return null;
    }

    async createNewTimeSheet(sheetId: string): Promise<string> {
        const sheetName = new Date().toISOString().split('T')[0];
        const newSheet = await this.googleSheetsService.createWorksheet(sheetId, sheetName);
        const newSheetId = newSheet.sheetId;

        const requests = [
            // Add "Invoiced" checkbox in cell A1
            {
                updateCells: {
                    rows: [{ values: [{ dataValidation: { condition: { type: 'BOOLEAN' } } }] }],
                    fields: 'dataValidation',
                    start: { sheetId: newSheetId, rowIndex: 0, columnIndex: 0 },
                },
            },
            // Add labels and formulas
            {
                updateCells: {
                    rows: [
                        { values: [{ userEnteredValue: { stringValue: 'Total Hours:' } }, { userEnteredValue: { formulaValue: '=SUM(D6:D)' } }] },
                        { values: [{ userEnteredValue: { stringValue: 'Total Billable:' } }, { userEnteredValue: { formulaValue: '=SUM(E6:E)' } }] },
                    ],
                    fields: 'userEnteredValue',
                    start: { sheetId: newSheetId, rowIndex: 1, columnIndex: 0 },
                },
            },
            // Add headers
            {
                updateCells: {
                    rows: [
                        {
                            values: [
                                { userEnteredValue: { stringValue: 'Date' } },
                                { userEnteredValue: { stringValue: 'Start' } },
                                { userEnteredValue: { stringValue: 'End' } },
                                { userEnteredValue: { stringValue: 'Total Time' } },
                                { userEnteredValue: { stringValue: 'Billable Amount' } },
                            ],
                        },
                    ],
                    fields: 'userEnteredValue',
                    start: { sheetId: newSheetId, rowIndex: 4, columnIndex: 0 },
                },
            },
            // Set column widths
            {
                updateDimensionProperties: {
                    range: {
                        sheetId: newSheetId,
                        dimension: 'COLUMNS',
                        startIndex: 0,
                        endIndex: 5,
                    },
                    properties: {
                        pixelSize: 120,
                    },
                    fields: 'pixelSize',
                },
            },
            // Format columns
            {
                repeatCell: {
                    range: { sheetId: newSheetId, startColumnIndex: 0, endColumnIndex: 1 },
                    cell: { userEnteredFormat: { numberFormat: { type: 'DATE' } } },
                    fields: 'userEnteredFormat.numberFormat',
                },
            },
            {
                repeatCell: {
                    range: { sheetId: newSheetId, startColumnIndex: 1, endColumnIndex: 3 },
                    cell: { userEnteredFormat: { numberFormat: { type: 'TIME', pattern: 'hh:mm:ss' } } },
                    fields: 'userEnteredFormat.numberFormat',
                },
            },
            {
                repeatCell: {
                    range: { sheetId: newSheetId, startColumnIndex: 3, endColumnIndex: 4 },
                    cell: { userEnteredFormat: { numberFormat: { type: 'TIME', pattern: '[h]:mm:ss' } } },
                    fields: 'userEnteredFormat.numberFormat',
                },
            },
            {
                repeatCell: {
                    range: { sheetId: newSheetId, startColumnIndex: 4, endColumnIndex: 5 },
                    cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '$#,##0.00' } } },
                    fields: 'userEnteredFormat.numberFormat',
                },
            },
            // Add formulas to columns D and E
            {
                updateCells: {
                    rows: [
                        {
                            values: [
                                { userEnteredValue: { formulaValue: '=IF(C6<>"", C6-B6, "")' } },
                                { userEnteredValue: { formulaValue: '=IF(D6<>"", D6*24*Config!$B$2, "")' } },
                            ],
                        },
                    ],
                    fields: 'userEnteredValue',
                    start: { sheetId: newSheetId, rowIndex: 5, columnIndex: 3 },
                },
            },
        ];

        await this.googleSheetsService.batchUpdate(sheetId, requests);
        return sheetName;
    }

    async isTimerRunning(sheetId: string, worksheetName: string): Promise<boolean> {
        const data = await this.googleSheetsService.getWorksheetData(sheetId, worksheetName, 'A6:C');
        if (!data || data.length === 0) {
            return false;
        }

        const lastRow = data[data.length - 1];
        // A timer is running if there's a start time (column B) but no end time (column C)
        const hasStartTime = lastRow[1] && lastRow[1] !== '';
        const hasEndTime = lastRow[2] && lastRow[2] !== '';

        return hasStartTime && !hasEndTime;
    }

    async getConfig(sheetId: string) {
        const cached = this.configCache[sheetId];
        if (cached && (Date.now() - cached.timestamp < this.cacheTTL)) {
            return cached.config;
        }

        const data = await this.googleSheetsService.getWorksheetData(sheetId, 'Config', 'A1:B10');
        if (!data) {
            throw new Error('Config sheet not found or is empty.');
        }

        const config = data.reduce((acc, row) => {
            if (row[0] && row[1]) {
                acc[row[0]] = row[1];
            }
            return acc;
        }, {} as { [key: string]: string });

        this.configCache[sheetId] = { config, timestamp: Date.now() };

        return config;
    }
}
