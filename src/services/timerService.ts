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
        const config = await this.getConfig(sheetId);
        const timezone = config['Timezone'] || 'UTC';

        let currentSheet = await this.getCurrentSheet(sheetId);
        if (!currentSheet) {
            currentSheet = await this.createNewTimeSheet(sheetId, timezone);
        }

        const timerRunning = await this.isTimerRunning(sheetId, currentSheet);
        if (timerRunning) {
            throw new TimerAlreadyRunningError();
        }

        const now = this.getDateInTimezone(new Date(), timezone);
        const date = now.toISOString().split('T')[0];
        const time = this.formatTime12Hour(now);
        const row = [date, time]; // Date, Start

        await this.googleSheetsService.appendRow(sheetId, currentSheet, row);

        return {
            sheet: currentSheet,
            date,
            start: time,
        };
    }

    async stopTimer(sheetId: string, endTime?: Date) {
        const config = await this.getConfig(sheetId);
        const timezone = config['Timezone'] || 'UTC';

        const currentSheet = await this.getCurrentSheet(sheetId);
        if (!currentSheet) {
            throw new NoActiveTimerError();
        }

        const activeTimer = await this.findActiveTimerRow(sheetId, currentSheet);
        if (!activeTimer) {
            throw new NoActiveTimerError();
        }

        const actualEndTime = endTime || new Date();
        const endTimeInTimezone = this.getDateInTimezone(actualEndTime, timezone);
        const endTimeString = this.formatTime12Hour(endTimeInTimezone);
        const cell = `C${activeTimer.index}`;

        await this.googleSheetsService.updateCell(sheetId, currentSheet, cell, endTimeString);

        const startTime = activeTimer.row[1];
        const startDate = this.parse12HourTime(startTime);
        const endDate = this.parse12HourTime(endTimeString);
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
            end: endTimeInTimezone,
            duration,
        };
    }

    private async findActiveTimerRow(sheetId: string, worksheetName: string): Promise<{ row: any[], index: number } | null> {
        const data = await this.googleSheetsService.getWorksheetData(sheetId, worksheetName, 'A6:C');
        if (!data || data.length === 0) {
            return null;
        }

        // Only check the last row
        const lastRowIndex = data.length - 1;
        const lastRow = data[lastRowIndex];
        if (!lastRow) {
            return null; // Handle undefined rows
        }

        const hasStartTime = lastRow[1] && lastRow[1] !== '';
        const hasEndTime = lastRow[2] && lastRow[2] !== '';

        if (hasStartTime && !hasEndTime) {
            // Add 6 to the index to account for the offset (data starts at row 6)
            return { row: lastRow, index: lastRowIndex + 6 };
        }

        return null; // No active timer found
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

    async createNewTimeSheet(sheetId: string, timezone?: string): Promise<string> {
        const now = this.getDateInTimezone(new Date(), timezone);
        const sheetName = now.toISOString().split('T')[0];
        if (!sheetName) {
            throw new Error('Failed to generate sheet name.');
        }

        // Ensure Config sheet exists before creating new time sheet
        await this.ensureConfigSheetExists(sheetId);

        const newSheet = await this.googleSheetsService.createWorksheet(sheetId, sheetName);
        if (!newSheet) {
            throw new Error('Failed to create new sheet.');
        }

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
                    cell: { userEnteredFormat: { numberFormat: { type: 'TIME', pattern: 'h:mm:ss AM/PM' } } },
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
                                { userEnteredValue: { formulaValue: '=IF(D6<>"", D6*24*Config!$B$1, "")' } },
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
        if (!lastRow) {
            return false; // Handle undefined rows
        }

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

        let data;
        try {
            data = await this.googleSheetsService.getWorksheetData(sheetId, 'Config', 'A1:B10');
        } catch (error) {
            // If Config sheet doesn't exist, create it with default values
            await this.createConfigSheet(sheetId);
            // Return default config
            const defaultConfig = { 'Hourly Rate': '100', 'Timezone': 'UTC' };
            this.configCache[sheetId] = { config: defaultConfig, timestamp: Date.now() };
            return defaultConfig;
        }

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

    private async createConfigSheet(sheetId: string): Promise<void> {
        // Create the Config worksheet
        const configSheet = await this.googleSheetsService.createWorksheet(sheetId, 'Config');
        if (!configSheet) {
            throw new Error('Failed to create Config worksheet.');
        }

        const configSheetId = configSheet.sheetId;

        const requests = [
            // Add headers and default values
            {
                updateCells: {
                    rows: [
                        { values: [
                            { userEnteredValue: { stringValue: 'Hourly Rate' } },
                            { userEnteredValue: { numberValue: 100 } }
                        ] },
                        { values: [
                            { userEnteredValue: { stringValue: 'Timezone' } },
                            { userEnteredValue: { stringValue: 'UTC' } }
                        ] }
                    ],
                    fields: 'userEnteredValue',
                    start: { sheetId: configSheetId, rowIndex: 0, columnIndex: 0 },
                },
            },
            // Format column B as currency
            {
                repeatCell: {
                    range: { sheetId: configSheetId, startColumnIndex: 1, endColumnIndex: 2 },
                    cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '$#,##0.00' } } },
                    fields: 'userEnteredFormat.numberFormat',
                },
            },
            // Set column widths
            {
                updateDimensionProperties: {
                    range: {
                        sheetId: configSheetId,
                        dimension: 'COLUMNS',
                        startIndex: 0,
                        endIndex: 2,
                    },
                    properties: {
                        pixelSize: 120,
                    },
                    fields: 'pixelSize',
                },
            },
        ];

        await this.googleSheetsService.batchUpdate(sheetId, requests);
    }

    private async ensureConfigSheetExists(sheetId: string): Promise<void> {
        try {
            // Check if Config sheet exists by trying to get its worksheets
            const worksheets = await this.googleSheetsService.getWorksheets(sheetId);
            const configExists = worksheets.some(name => name === 'Config');
            
            if (!configExists) {
                await this.createConfigSheet(sheetId);
            }
        } catch (error) {
            // If we can't check worksheets, try to create Config sheet anyway
            await this.createConfigSheet(sheetId);
        }
    }

    private getDateInTimezone(date: Date, timezone?: string): Date {
        if (!timezone || timezone === 'UTC') {
            return date;
        }

        try {
            // Get the date/time string in the target timezone
            const timeInTimezone = date.toLocaleString("en-CA", { 
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            
            // Parse the timezone-adjusted time back to a Date object
            // Format will be "YYYY-MM-DD, HH:mm:ss"
            const [datePart, timePart] = timeInTimezone.split(', ');
            const [year, month, day] = datePart.split('-').map(Number);
            const [hour, minute, second] = timePart.split(':').map(Number);
            
            return new Date(year, month - 1, day, hour, minute, second);
        } catch (error) {
            // Fallback to original date if timezone conversion fails
            return date;
        }
    }

    private formatTime12Hour(date: Date): string {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }

    private parse12HourTime(timeString: string): Date {
        // Parse 12-hour format time like "12:23:45 PM"
        const [timePart, period] = timeString.split(' ');
        const [hours, minutes, seconds] = timePart.split(':').map(Number);
        
        let hour24 = hours;
        if (period === 'AM' && hours === 12) {
            hour24 = 0;
        } else if (period === 'PM' && hours !== 12) {
            hour24 = hours + 12;
        }
        
        return new Date(0, 0, 0, hour24, minutes, seconds || 0);
    }
}
