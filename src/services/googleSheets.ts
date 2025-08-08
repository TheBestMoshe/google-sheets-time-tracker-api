import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

export class GoogleSheetsService {
    private sheets: any;

    constructor() {
        this.sheets = null;
    }

    async authenticate() {
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const authClient = await auth.getClient();
        this.sheets = google.sheets({ version: 'v4', auth: authClient });
    }

    async getSpreadsheet(sheetId: string) {
        if (!this.sheets) {
            throw new Error('Google Sheets API not authenticated.');
        }
        const response = await this.sheets.spreadsheets.get({
            spreadsheetId: sheetId,
        });
        return response.data;
    }

    async getWorksheets(sheetId: string): Promise<string[]> {
        if (!this.sheets) {
            throw new Error('Google Sheets API not authenticated.');
        }
        const res = await this.sheets.spreadsheets.get({
            spreadsheetId: sheetId,
            fields: 'sheets.properties.title',
        });
        return res.data.sheets.map((sheet: any) => sheet.properties.title);
    }

    async createWorksheet(sheetId: string, title: string): Promise<any> {
        if (!this.sheets) {
            throw new Error('Google Sheets API not authenticated.');
        }
        const result = await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: sheetId,
            resource: {
                requests: [
                    {
                        addSheet: {
                            properties: {
                                title,
                            },
                        },
                    },
                ],
            },
        });
        const newSheet = result.data.replies[0].addSheet.properties;
        return newSheet;
    }

    async getWorksheetData(sheetId: string, worksheetName: string, range: string): Promise<any[][] | undefined> {
        if (!this.sheets) {
            throw new Error('Google Sheets API not authenticated.');
        }
        const res = await this.sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${worksheetName}!${range}`,
        });
        return res.data.values;
    }

    async appendRow(sheetId: string, worksheetName: string, values: any[]) {
        if (!this.sheets) {
            throw new Error('Google Sheets API not authenticated.');
        }
        await this.sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: `${worksheetName}!A1`, // Append after the last row of the table
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [values],
            },
        });
    }

    async updateCell(sheetId: string, worksheetName: string, cell: string, value: any) {
        if (!this.sheets) {
            throw new Error('Google Sheets API not authenticated.');
        }
        await this.sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: `${worksheetName}!${cell}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[value]],
            },
        });
    }

    async batchUpdate(sheetId: string, requests: any[]) {
        if (!this.sheets) {
            throw new Error('Google Sheets API not authenticated.');
        }
        await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: sheetId,
            resource: {
                requests,
            },
        });
    }

    async checkConnection() {
        if (!this.sheets) {
            throw new Error('Google Sheets API not authenticated.');
        }
        // A simple, low-cost call to check connectivity using a public Google Sheet
        await this.sheets.spreadsheets.get({
            spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        });
    }
}
