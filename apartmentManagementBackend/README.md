# TSAcapstoneProjectGroup75
Backend API for the Apartment Management System

## Running locally
1. `npm install`
2. Copy `.env.example` to `.env` and fill in the values (see the comments in the file).
3. `npm run dev` (or `npm start`)
4. Create the first admin (see below).

Without `EMAIL_USER`/`EMAIL_PASSWORD`, registration fails because the verification email can't be sent. Without the `CLOUDINARY_*` keys, image uploads fail. Everything else works.

## Deploying
Set these on the hosting service (for example Render or Railway):

| Variable | Value |
|---|---|
| `NODE_ENV` | `production`. Needed so the refresh cookie works when the frontend is on another domain |
| `FRONTEND_URL` | The deployed frontend address, e.g. `https://your-app.vercel.app`. It's used in email links and allowed by CORS. Add more origins comma-separated |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET`, `REFRESH_TOKEN_SECRET` | Long random strings, different from each other |
| `EMAIL_USER`, `EMAIL_PASSWORD` | A Gmail address and a Gmail **app password** |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | From the Cloudinary dashboard |

Then run `npm run create-admin` once against the production database. The site must be served over HTTPS for the refresh cookie to work in production.

## Images
Properties and apartments can have up to 10 images each.
- Upload when creating: send `multipart/form-data` with the fields plus `images` files.
- Add to an existing one: `POST /properties/:id/images` or `POST /api/apartments/:id/images` with `images` files.
- Replace or delete one: `PUT` or `DELETE /properties/:propertyId/images/:imageId` (same pattern for apartments).
- Profile picture: `POST /api/users/profile-picture` with a `profilePicture` file.

## Other endpoints worth knowing
- `GET /properties`, `GET /properties/:id`, `GET /api/apartments`, `GET /api/apartments/:id` are public (no login needed), so visitors can browse listings.
- `GET /api/users/tenants` (manager, admin): verified tenants' `_id`, `name` and `email`, used when creating a tenancy.
- `GET /api/users?page=1&limit=20` (admin): paginated user list (`limit` max 100).

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
