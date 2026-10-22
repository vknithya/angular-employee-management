# HMS Portal — Hospital Management

A frontend-only MVP of an employee management portal, built with Angular 21 (standalone, signals, zoneless) and Angular Material 3.

There is no server yet. Every API call is answered in the browser by a **mock backend**, which stores its data in `localStorage` and waits **2 seconds** before replying so loading states can be seen in demos. A real backend can replace it without changing any feature code (see [Connecting a real backend](#connecting-a-real-backend)).

## Demo accounts

| Role     | Email                  | Password       |
| -------- | ---------------------- | -------------- |
| Admin    | `admin@company.com`    | `Admin@123`    |
| Employee | `employee@company.com` | `Employee@123` |

The login page has one-click buttons that fill these in. To go back to the original sample data, open the user menu and choose **Reset demo data**.

## Features

**Authentication**
- Login with validation, inline errors, and "Remember me" (kept in `localStorage`; otherwise in `sessionStorage`)
- Forgot password flow
- Session expiry: a 401 response signs the user out and sends them back to the page they were on after they log in again
- Route guards: signed-in only, guests only, and admin only

**Dashboard** (different for each role)
- Admin: KPI tiles, headcount by department, pending leave requests, recent hires, upcoming birthdays and holidays
- Employee: leave balances, personal summary, recent leave requests, holidays

**Employees**
- Directory with search, department and status filters, sorting, pagination, and CSV export
- Admins can add, edit, and delete employees. Forms are validated (email format, phone format, minimum age of 18, unique email) and warn about unsaved changes before you leave the page
- Detail page. Salary and personal details are visible only to admins and to the employee themselves

**Departments** (admin)
- Department cards that show the department head and headcount
- Create and edit in a dialog. A department that still has employees cannot be deleted

**Leave management**
- Employees: balance per leave type, apply for leave (weekends are excluded; the request is checked against the balance and against overlapping requests), and cancel pending requests
- Admins: approval queue with status filters and counts, approve or reject (a reason is required to reject). Admins cannot approve their own requests

**Profile**
- View your own details and edit your contact information
- Change password (strength rules and a confirm field)

**General**
- Responsive layout (the sidebar collapses on mobile) and a light/dark theme toggle
- Global progress bar, a loader on each page, spinners on buttons, empty states, and retry on errors
- Toast notifications, confirmation dialogs, and page titles

## Project structure

```
src/
├── environments/environment.ts   # apiBaseUrl, useMockBackend, mockApiDelayMs
└── app/
    ├── core/
    │   ├── models/               # Domain types (Employee, Department, LeaveRequest…)
    │   ├── http/                 # Auth token, loading, error interceptors
    │   ├── mock-api/             # In-browser backend: routes, seed data, localStorage DB
    │   ├── services/             # Notifications, theme, loading state
    │   └── utils/                # Dates, CSV, validators, error messages
    ├── shared/                   # Reusable UI (page header, loader, avatar, dialogs…)
    ├── layout/shell/             # Sidebar + toolbar app shell
    └── features/
        ├── authentication/       # Login, forgot password, AuthService, guards
        ├── dashboard/
        ├── employees/            # List, detail, form, EmployeeService
        ├── departments/
        ├── leaves/
        └── profile/
```

Feature services such as `EmployeeService` and `LeaveService` only call `HttpClient` against `/api/...`. They do not know whether the mock backend or a real server answers.

## Connecting a real backend

1. Implement the endpoints listed in `src/app/core/mock-api/mock-api.ts`. Its route table is the API contract.
2. In `src/environments/environment.ts`, set `apiBaseUrl` to your server and `useMockBackend` to `false`.
3. Delete `core/mock-api/` and `core/services/demo.service.ts`, and remove the demo account buttons from the login page.

## Development

```bash
npm start      # dev server at http://localhost:4200
npm run build  # production build to dist/
npm test       # unit tests (Vitest)
```
