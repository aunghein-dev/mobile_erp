# Openware ERP Mobile (React Native)

A production-oriented React Native transformation of the `frontend_erp` web app, built in a separate workspace at:

This app references the web ERP domain model and backend contracts while keeping `frontend_erp` untouched.

## Stack

- Expo SDK 54 + React Native 0.81 + TypeScript
- React Navigation (Drawer + Auth Stack)
- React Query for server state
- Zustand + AsyncStorage persistence for local app state
- Axios API client with auth/session interception
- React Hook Form + Zod
- Expo Camera + Image Picker
- i18n-js with `en` and `my` locale bundles copied from web app

## Implemented mobile modules

- Authentication: Login, Signup, Remember me
- Home POS: stock list, search, cart, checkout post
- Dashboard: KPI cards, trend bars, pie ranking, storage health
- Sales: Transactions, Reports, Batch Payments (paginated)
- Inventory: Stocks, Bulk Entry (multipart image upload), Customers
- Expenses: list, approvals (approve/reject), headings (create/delete)
- Barcode: scanner stock check, intake capture, barcode settings
- Reports: currency sales report
- Users: teller listing + create teller form
- Settings: business settings, logo upload, profile update, shops CRUD
- Legal: privacy policy and terms screens

## Environment

1. Copy env:

```bash
cp .env.example .env
```

2. Set backend API URL:

```env
EXPO_PUBLIC_API_URL=http://localhost:8080
```

## Run

```bash
npm install
npm run typecheck
npm run ios
# or
npm run android
```

## Testing

```bash
npm run test
npm run test:coverage
```

Quality gate including tests:

```bash
npm run quality:full
```

## Notes

- Backend expects cookie-based auth; requests use `withCredentials: true`.
- The mobile app follows the web ERP endpoint structure (`/auth`, `/info`, `/stkG`, `/checkout`, `/expense`, etc.).
- If your backend CORS/cookie settings differ on mobile, adjust server settings accordingly.
