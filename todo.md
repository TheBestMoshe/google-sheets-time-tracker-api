# Time Tracker API - Engineering TODO List

## Project Setup & Configuration

### 1. Initialize Project
- [x] Create new Bun project with TypeScript
  ```bash
  bun init
  ```
- [x] Install required dependencies:
  - [x] `@google-cloud/local-auth` or `google-auth-library`
  - [x] `googleapis` (for Google Sheets API v4)
  - [x] `@types/node` (TypeScript types)
  - [x] Optional: `zod` for request validation
  - [x] Optional: `winston` or `pino` for logging

### 2. Project Structure
- [x] Create the following directory structure:
  ```
  /
  ├── src/
  │   ├── index.ts           # Main server file
  │   ├── routes/
  │   │   └── timer.ts        # Timer endpoints
  │   ├── services/
  │   │   ├── googleSheets.ts # Google Sheets integration
  │   │   └── timerService.ts # Timer business logic
  │   ├── types/
  │   │   └── index.ts        # TypeScript interfaces
  │   └── utils/
  │       ├── auth.ts         # Google auth setup
  │       └── errors.ts       # Error handling
  ├── Dockerfile
  ├── docker-compose.yml
  ├── .env.example
  └── tsconfig.json
  ```

## Core Implementation Tasks

### 3. Google Sheets Integration Service
- [x] Create GoogleSheetsService class with methods:
  - [x] `authenticate()` - Initialize Google Sheets API with service account
  - [x] `getSpreadsheet(sheetId: string)` - Fetch spreadsheet metadata
  - [x] `getWorksheets(sheetId: string)` - List all worksheets
  - [x] `createWorksheet(sheetId: string, title: string)` - Create new worksheet
  - [x] `getWorksheetData(sheetId: string, worksheetName: string)` - Read worksheet data
  - [x] `appendRow(sheetId: string, worksheetName: string, values: any[])` - Add new row
  - [x] `updateCell(sheetId: string, worksheetName: string, cell: string, value: any)` - Update specific cell
  - [x] `batchUpdate(sheetId: string, requests: any[])` - Batch operations

### 4. Timer Service Implementation
- [x] Create TimerService class with methods:
  - [x] `startTimer(sheetId: string, description?: string)`
    - [x] Check if sheet exists, create if needed
    - [x] Check if current sheet is invoiced
    - [x] Check for running timer
    - [x] Add new timer entry
  - [x] `stopTimer(sheetId: string)`
    - [x] Find active timer
    - [x] Update end time
    - [ ] Return duration
  - [x] `getCurrentSheet(sheetId: string)`
    - [x] Find most recent non-invoiced sheet
    - [x] Return sheet name or null
  - [x] `createNewTimeSheet(sheetId: string)`
    - [x] Generate sheet name (current date)
    - [x] Create worksheet with proper structure
    - [x] Add formulas and headers
  - [x] `isTimerRunning(sheetId: string, worksheetName: string)`
    - [x] Check last row for missing end time
  - [x] `getConfig(sheetId: string)`
    - [x] Read config worksheet
    - [ ] Cache configuration values

### 5. Worksheet Structure Setup
- [x] Implement `setupNewWorksheet()` function:
  - [x] Add "Invoiced" checkbox in cell A1
  - [x] Add "Total Hours:" label in A2, formula `=SUM(D6:D)` in B2
  - [x] Add "Total Billable:" label in A3, formula `=SUM(E6:E)` in B3
  - [x] Add headers in row 5: "Date", "Start", "End", "Total Time", "Billable Amount"
  - [ ] Format columns appropriately (date, time, duration, currency)
  - [ ] Set column widths

### 6. API Endpoints
- [x] Implement `POST /timer/start`:
  ```typescript
  interface StartRequest {
    sheetId: string;
    description?: string;
  }
  ```
  - [x] Validate request body
  - [x] Call TimerService.startTimer()
  - [x] Handle all edge cases
  - [x] Return appropriate response

- [x] Implement `POST /timer/stop`:
  ```typescript
  interface StopRequest {
    sheetId: string;
  }
  ```
  - [x] Validate request body
  - [x] Call TimerService.stopTimer()
  - [x] Handle all edge cases
  - [x] Return appropriate response

- [x] Implement `GET /health`:
  - [x] Return service status
  - [ ] Check Google Sheets API connectivity

### 7. Formula Implementation
- [ ] Time calculation formula for column D: `=IF(C6<>"", C6-B6, "")`
- [ ] Billable amount formula for column E: `=IF(D6<>"", D6*24*Config!$B$2, "")`
- [ ] Number formatting:
  - [ ] Duration format: `[h]:mm:ss`
  - [ ] Currency format: `$#,##0.00`

### 8. Error Handling
- [ ] Create custom error classes:
  - [ ] `SheetNotFoundError`
  - [ ] `TimerAlreadyRunningError`
  - [ ] `NoActiveTimerError`
  - [ ] `AuthenticationError`
  - [ ] `GoogleSheetsAPIError`
- [ ] Implement global error handler middleware
- [ ] Add proper logging for all errors

### 9. Configuration Management
- [ ] Setup environment variable parsing:
  - [ ] `GOOGLE_SERVICE_ACCOUNT_KEY` (Base64 encoded JSON)
  - [ ] `PORT` (default: 3000)
  - [ ] `NODE_ENV` (development/production)
- [ ] Create config validation on startup
- [x] Add `.env.example` with all required variables

## Testing

### 10. Unit Tests
- [ ] Test GoogleSheetsService methods
- [x] Test TimerService business logic
- [x] Test error handling scenarios
- [ ] Test formula generation
- [x] Mock Google Sheets API calls

### 11. Integration Tests
- [ ] Test full timer start/stop flow
- [ ] Test sheet creation and invoicing workflow
- [ ] Test concurrent timer attempts
- [ ] Test with real Google Sheets (test account)

## Docker & Deployment

### 12. Dockerization
- [x] Create Dockerfile:
  ```dockerfile
  FROM oven/bun:latest
  WORKDIR /app
  COPY package.json bun.lockb ./
  RUN bun install --production
  COPY . .
  EXPOSE 3000
  CMD ["bun", "run", "src/index.ts"]
  ```
- [x] Create docker-compose.yml for local development
- [ ] Add .dockerignore file
- [ ] Test container builds and runs correctly

### 13. Production Readiness
- [ ] Add request logging middleware
- [ ] Implement rate limiting (optional)
- [ ] Add CORS configuration if needed
- [ ] Setup health check endpoint
- [ ] Add graceful shutdown handling
- [ ] Configure proper error responses (no stack traces in production)

## Documentation

### 14. API Documentation
- [x] Create README.md with:
  - [x] Setup instructions
  - [x] API endpoint documentation
  - [x] Google Service Account setup guide
  - [x] Docker deployment instructions
- [ ] Add inline code comments
- [ ] Create example requests (curl/Postman collection)

### 15. Google Sheets Setup Guide
- [ ] Document how to:
  - [ ] Create service account
  - [ ] Enable Google Sheets API
  - [ ] Share sheets with service account email
  - [ ] Set up initial Config worksheet
  - [ ] Structure explanation

## Testing Checklist

### 16. Manual Testing Scenarios
- [ ] Start timer on empty sheet (should create new sheet)
- [ ] Start timer when timer already running (should return error)
- [ ] Stop timer when timer is running (should succeed)
- [ ] Stop timer when no timer running (should return error)
- [ ] Start timer on invoiced sheet (should create new sheet)
- [ ] Verify formulas calculate correctly
- [ ] Test with multiple simultaneous clients (different sheet IDs)
- [ ] Test error handling for invalid sheet IDs
- [ ] Test service account permission errors

## Performance & Monitoring

### 17. Performance Optimization
- [ ] Implement caching for:
  - [ ] Config values (with TTL)
  - [ ] Sheet metadata
  - [ ] Current timer state
- [ ] Batch Google Sheets API calls where possible
- [ ] Add request/response compression

### 18. Monitoring Setup (Optional)
- [ ] Add metrics collection:
  - [ ] API response times
  - [ ] Google Sheets API latency
  - [ ] Error rates
  - [ ] Active timer count
- [ ] Setup logging aggregation
- [ ] Create alerting rules

## Final Steps

### 19. Code Review Checklist
- [ ] TypeScript types properly defined
- [ ] No hardcoded values
- [ ] Proper error handling throughout
- [ ] Consistent code style
- [ ] No console.log statements in production
- [ ] Secrets properly managed
- [ ] Input validation on all endpoints

### 20. Delivery
- [ ] Push to Git repository
- [ ] Create Docker image and push to registry
- [ ] Write deployment instructions
- [ ] Create example .env file
- [ ] Provide Postman/Insomnia collection
- [ ] Schedule handover meeting

## Estimated Timeline
- **Week 1**: Setup, Google Sheets integration, core services
- **Week 2**: API endpoints, error handling, testing
- **Week 3**: Docker setup, documentation, production readiness

## Key Technical Decisions to Make
1. **Validation Library**: Zod vs manual validation
2. **Logging**: Winston vs Pino vs Bun's built-in
3. **Testing Framework**: Bun's built-in vs Jest vs Vitest
4. **API Framework**: Native Bun.serve() vs Elysia vs Hono
5. **Error Tracking**: Sentry integration or custom logging

## Important Notes
- Always handle Google Sheets API rate limits (100 requests per 100 seconds per user)
- Service account JSON must be kept secure
- Consider implementing exponential backoff for API retries
- Test thoroughly with real Google Sheets before production deployment
- Ensure proper date/time handling across timezones