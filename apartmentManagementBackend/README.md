# TSAcapstoneProjectGroup75
Backend API for the Apartment Management System

## Creating the first admin
Admins can't register through the API. Create one from the command line:

```
npm run create-admin -- "Admin Name" admin@example.com "StrongPassword"
```

Or set `ADMIN_NAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` and run `npm run create-admin`. Running it again for an existing email resets that account's password and makes it an admin.

## Manager registration
Everyone registers as a tenant. Choosing "manager" at signup files a request that an admin must approve.

1. `POST /api/auth/register` with `accountType: "manager"` (default is `"tenant"`):
   ```json
   { "name": "Jane Doe", "email": "jane@example.com", "password": "secret123", "accountType": "manager" }
   ```
   The user is saved with `role: "tenant"` and `managerRequest: "PENDING"`.
2. The user verifies their email and can log in. The login response includes `managerRequest`, so the frontend can show that approval is pending.
3. An admin lists requests: `GET /api/users/manager-requests?status=PENDING` (`status` can be `PENDING`, `APPROVED` or `REJECTED`; default `PENDING`).
4. The admin decides: `PATCH /api/users/:id/manager-request` with `{ "action": "approve" }` or `{ "action": "reject" }`.
   - Approve sets `role: "manager"` and `managerRequest: "APPROVED"`. The user must have verified their email first.
   - Reject keeps them as a tenant and sets `managerRequest: "REJECTED"`.
   - The user gets an email either way.

The new role applies on the user's next request; they don't need to log in again.
