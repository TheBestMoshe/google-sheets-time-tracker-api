# Time Tracker API - Project Documentation

## Executive Summary

This project involves building a lightweight, stateless REST API that enables time tracking directly within Google Sheets. The API will allow users to start and stop timers, with all time entries automatically recorded in Google Sheets for easy invoicing and client management. Each client will have their own dedicated Google Sheet, making billing transparent and accessible.

## Project Rationale

### Problem Statement
Currently, time tracking for client work requires either expensive dedicated software or manual entry into spreadsheets. This creates friction in the billing process and makes it difficult to maintain accurate records across multiple clients.

### Solution
A simple API that bridges the gap between programmatic time tracking and the familiar Google Sheets interface. This solution provides:
- **Simplicity**: Start/stop timers with simple API calls
- **Transparency**: Clients can potentially access their own tracking sheets
- **Flexibility**: Easy to integrate with existing workflows
- **Cost-effectiveness**: Uses free Google Sheets as the database
- **Portability**: Runs as a stateless Docker container

## System Architecture

### Overview
The system consists of a stateless Bun/TypeScript API that interfaces with Google Sheets via the Google Sheets API v4. Each client has their own Google Sheets document, and the API manages time entries within worksheets in these documents.

### Key Components
1. **REST API Server** (Bun + TypeScript)
2. **Google Sheets Integration** (via Service Account)
3. **Docker Container** (for deployment)
4. **Google Sheets Structure** (per client)

## Detailed Specifications

### API Endpoints

#### 1. Start Timer
- **Endpoint**: `POST /timer/start`
- **Request Body**:
  ```json
  {
    "sheetId": "1a2b3c4d5e6f...",
    "description": "Optional task description"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Timer started",
    "entry": {
      "date": "2025-01-06",
      "start": "09:30:00",
      "sheet": "2025-01-06"
    }
  }
  ```
- **Error Cases**:
  - Timer already running: Returns message indicating timer is already active
  - Invalid sheet ID: Returns authentication/access error
  - Sheet is invoiced: Creates new sheet and starts timer there

#### 2. Stop Timer
- **Endpoint**: `POST /timer/stop`
- **Request Body**:
  ```json
  {
    "sheetId": "1a2b3c4d5e6f..."
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Timer stopped",
    "entry": {
      "date": "2025-01-06",
      "start": "09:30:00",
      "end": "11:45:00",
      "duration": "2:15:00",
      "sheet": "2025-01-06"
    }
  }
  ```
- **Error Cases**:
  - No timer running: Returns message indicating no active timer
  - Invalid sheet ID: Returns authentication/access error

### Google Sheets Structure

#### Configuration Worksheet
- **Name**: "Config"
- **Structure**:
  | Setting | Value |
  |---------|-------|
  | Hourly Rate | 100 |
  | Currency | USD |
  | Client Name | ACME Corp |
  | Tax Rate | 0 |

#### Time Tracking Worksheets
- **Naming Convention**: Start date format "YYYY-MM-DD" (e.g., "2025-01-06")
- **Columns**:
  | Column | Type | Description |
  |--------|------|-------------|
  | A: Date | Date | The date of the entry |
  | B: Start | Time | Start time (24hr format) |
  | C: End | Time | End time (24hr format) |
  | D: Total Time | Formula | `=C2-B2` formatted as duration |
  | E: Billable Amount | Formula | `=D2*24*Config!B2` |

- **Summary Section** (Top of sheet):
  - Row 1: Checkbox for "Invoiced" status
  - Row 2: Total Hours: `=SUM(D:D)`
  - Row 3: Total Billable: `=SUM(E:E)`
  - Row 5: Headers for the data columns
  - Row 6+: Time entries

### Business Logic

#### Timer State Management
1. **Starting a Timer**:
   - Check if current sheet exists, if not create it
   - Check if current sheet is marked as invoiced
     - If yes, create new sheet with next date as name
   - Check if timer is already running (has start but no end time in last row)
     - If running, return "already running" message
     - If not, append new row with current date and start time

2. **Stopping a Timer**:
   - Find the last row with a start time but no end time
   - If found, update with end time
   - If not found, return "no timer running" message

3. **Sheet Creation**:
   - Create new worksheet with naming convention
   - Add invoiced checkbox in A1
   - Add summary formulas in rows 2-3
   - Add column headers in row 5
   - Copy billing rate from Config sheet

### Configuration

#### Environment Variables
- `GOOGLE_SERVICE_ACCOUNT_KEY`: Base64 encoded service account JSON
- `PORT`: API port (default: 3000)
- `NODE_ENV`: Environment (development/production)

#### Service Account Setup
The service account must have:
- Google Sheets API enabled
- Editor access to all client Google Sheets
- Proper IAM permissions configured

### Error Handling

All errors should return appropriate HTTP status codes:
- `200`: Successful operation
- `400`: Bad request (missing parameters, invalid data)
- `401`: Authentication failed
- `403`: Access denied to sheet
- `409`: Conflict (timer already running/stopped)
- `500`: Internal server error

### Docker Deployment

The application will be containerized with:
- Base image: `oven/bun:latest`
- Exposed port: 3000
- Health check endpoint: `GET /health`
- Stateless architecture (no persistent storage required)

## Security Considerations

1. **Authentication**: Uses Google Service Account for Sheets access
2. **Authorization**: Each request must include valid sheet ID
3. **Data Isolation**: Each client's data is completely separated in different Google Sheets
4. **No Data Storage**: API remains stateless, all data persisted in Google Sheets
5. **Environment Variables**: Sensitive credentials stored as environment variables

## Future Enhancements

Potential improvements for future iterations:
1. Add JWT authentication for API access
2. Implement rate limiting
3. Add webhook notifications for timer events
4. Create a simple web UI
5. Add support for multiple concurrent timers with tags/projects
6. Implement automatic invoice generation
7. Add time tracking analytics endpoints
8. Support for team time tracking

## Success Criteria

The project will be considered successful when:
1. API can reliably start/stop timers
2. All time entries are accurately recorded in Google Sheets
3. Invoice workflow (checkbox → new sheet) works seamlessly
4. System handles edge cases gracefully
5. Docker container runs stably in production
6. Response times are under 500ms for all operations