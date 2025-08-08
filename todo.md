# Time Tracker API - Engineering TODO List

## Project Setup & Configuration

### 1. Initialize Project
- [ ] Create new Bun project with TypeScript
  ```bash
  bun init
  ```
- [ ] Install required dependencies:
  - [ ] `@google-cloud/local-auth` or `google-auth-library`
  - [ ] `googleapis` (for Google Sheets API v4)
  - [ ] `@types/node` (TypeScript types)
  - [ ] Optional: `zod` for request validation
  - [ ] Optional: `winston` or `pino` for logging

### 2. Project Structure
- [ ] Create the following directory structure:
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
- [ ] Create GoogleSheetsService class with methods:
  - [ ] `authenticate()` - Initialize Google Sheets API with service account
  - [ ] `getSpreadsheet(sheetId: string)` - Fetch spreadsheet metadata
  - [ ] `getWorksheets(sheetId: string)` - List all worksheets
  - [ ] `createWorksheet(sheetId: string, title: string)` - Create new worksheet
  - [ ] `getWorksheetData(sheetId: string, worksheetName: string)` - Read worksheet data
  - [ ] `appendRow(sheetId: string, worksheetName: string, values: any[])` - Add new row
  - [ ] `updateCell(sheetId: string, worksheetName: string, cell: string, value: any)` - Update specific cell
  - [ ] `batchUpdate(sheetId: string, requests: any[])` - Batch operations

### 4. Timer Service Implementation
- [ ] Create TimerService class with methods:
  - [ ] `startTimer(sheetId: string, description?: string)`
    - [ ] Check if sheet exists, create if needed
    - [ ] Check if current sheet is invoiced
    - [ ] Check for running timer
    - [ ] Add new timer entry
  - [ ] `stopTimer(sheetId: string)`
    - [ ] Find active timer
    - [ ] Update end time
    - [ ] Return duration
  - [ ] `getCurrentSheet(sheetId: string)`
    - [ ] Find most recent non-invoiced sheet
    - [ ] Return sheet name or null
  - [ ] `createNewTimeSheet(sheetId: string)`
    - [ ] Generate sheet name (current date)
    - [ ] Create worksheet with proper structure
    - [ ] Add formulas and headers
  - [ ] `isTimerRunning(sheetId: string, worksheetName: string)`
    - [ ] Check last row for missing end time
  - [ ] `getConfig(sheetId: string)`
    - [ ] Read config worksheet
    - [ ] Cache configuration values

### 5. Worksheet Structure Setup
- [ ] Implement `setupNewWorksheet()` function:
  - [ ] Add "Invoiced" checkbox in cell A1
  - [ ] Add "Total Hours:" label in A2, formula `=SUM(D6:D)` in B2
  - [ ] Add "Total Billable:" label in A3, formula `=SUM(E6:E)` in B3
  - [ ] Add headers in row 5: "Date", "Start", "End", "Total Time", "Billable Amount"
  - [ ] Format columns appropriately (date, time, duration, currency)
  - [ ] Set column widths

### 6. API Endpoints
- [ ] Implement `POST /timer/start`:
  ```typescript
  interface StartRequest {
    sheetId: string;
    description?: string;
  }
  ```
  - [ ] Validate request body
  - [ ] Call TimerService.startTimer()
  - [ ] Handle all edge cases
  - [ ] Return appropriate response

- [ ] Implement `POST /timer/stop`:
  ```typescript
  interface StopRequest {
    sheetId: string;
  }
  ```
  - [ ] Validate request body
  - [ ] Call TimerService.stopTimer()
  - [ ] Handle all edge cases
  - [ ] Return appropriate response

- [ ] Implement `GET /health`:
  - [ ] Return service status
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
- [ ] Add `.env.example` with all required variables

## Testing

### 10. Unit Tests
- [ ] Test GoogleSheetsService methods
- [ ] Test TimerService business logic
- [ ] Test error handling scenarios
- [ ] Test formula generation
- [ ] Mock Google Sheets API calls

### 11. Integration Tests
- [ ] Test full timer start/stop flow
- [ ] Test sheet creation and invoicing workflow
- [ ] Test concurrent timer attempts
- [ ] Test with real Google Sheets (test account)

## Docker & Deployment

### 12. Dockerization
- [ ] Create Dockerfile:
  ```dockerfile
  FROM oven/bun:latest
  WORKDIR /app
  COPY package.json bun.lockb ./
  RUN bun install --production
  COPY . .
  EXPOSE 3000
  CMD ["bun", "run", "src/index.ts"]
  ```
- [ ] Create docker-compose.yml for local development
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
- [ ] Create README.md with:
  - [ ] Setup instructions
  - [ ] API endpoint documentation
  - [ ] Google Service Account setup guide
  - [ ] Docker deployment instructions
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