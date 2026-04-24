# HP World Backend — myhpworld.com

Node.js + Express + MongoDB API powering the myHpWorld storefront and admin panel.

## Tech stack

| Concern        | Choice                                          |
|----------------|-------------------------------------------------|
| Runtime        | Node.js 18+                                     |
| Framework      | Express 4                                       |
| Database       | MongoDB (Mongoose ODM)                          |
| Auth           | JWT (separate secrets for users vs. admins)     |
| File uploads   | Multer (banner / product images → `/uploads`)   |
| Email          | Nodemailer (OTP, newsletter, order mails)       |
| Logging        | Morgan                                          |
| Dev tooling    | Nodemon, dotenv, express-async-errors           |

## Prerequisites

- Node.js **18+** — https://nodejs.org
- MongoDB running locally **or** a MongoDB Atlas connection string
- SMTP credentials (only needed if you want OTP / email flows to actually send)

## Quick start

```bash
cd backend
npm install
cp .env.example .env          # then edit .env with your own values
npm run seed                  # optional — creates demo admin + user + catalog
npm run dev                   # starts on http://localhost:3001
```

Verify it's up:

```bash
curl http://localhost:3001/api/health
# → { "status": "up" }
```

## Demo credentials (created by `npm run seed`)

| Role   | Email                   | Password   |
|--------|-------------------------|------------|
| Admin  | admin@myhpworld.com     | Admin@123  |
| User   | user@myhpworld.com      | User@123   |

Run `node seed.js --fresh` to wipe collections first, then re-insert. Change the
passwords before deploying anywhere public.

## NPM scripts

| Script         | What it does                                          |
|----------------|-------------------------------------------------------|
| `npm run dev`  | Starts the API with nodemon (auto-restart on changes) |
| `npm start`    | Starts the API with plain `node` (for production)     |
| `npm run seed` | Seeds the DB with demo accounts + baseline catalog    |

## Environment variables

See [.env.example](.env.example) for the full list with comments. Summary:

| Var                | Purpose                                               |
|--------------------|-------------------------------------------------------|
| `PORT`             | HTTP port (default `3001`)                            |
| `NODE_ENV`         | `development` / `production`                          |
| `MONGO_URI`        | MongoDB connection string                             |
| `JWT_SECRET`       | Signs customer JWTs                                   |
| `JWT_ADMIN_SECRET` | Signs admin JWTs (separate key = separate blast radius) |
| `JWT_EXPIRES_IN`   | Token lifetime (e.g. `7d`)                            |
| `CLIENT_ORIGIN`    | Allowed CORS origin (the Vite dev server)             |
| `SMTP_*`           | Nodemailer transport for OTP / order / newsletter mail |

## Project layout

```
backend/
├── server.js                    ← app bootstrap (CORS, JSON, morgan, routes)
├── seed.js                      ← demo data seeder
├── config/
│   └── db.js                    ← mongoose.connect() wrapper
├── middleware/
│   ├── authMiddleware.js        ← requireAuth (customer JWT)
│   ├── adminAuthMiddleware.js   ← requireAdmin (admin JWT)
│   ├── upload.js                ← multer config for image uploads
│   └── errorHandler.js          ← 404 + centralised error handler
├── models/                      ← mongoose schemas
│   ├── User.js        Admin.js
│   ├── Product.js     Category.js       NavCategory.js
│   ├── Banner.js      Offer.js          FeaturedProduct.js   Deal.js
│   ├── Order.js       Review.js
│   ├── Store.js       Newsletter.js     OtpCode.js
├── controllers/                 ← route handlers (one per feature)
│   ├── authController.js        ← register / login / me
│   ├── adminAuthController.js   ← admin login
│   ├── otpController.js         ← send + verify email OTP
│   ├── homeController.js        ← hero banners, offers, nav, featured, deal
│   ├── productController.js     ← catalog list / detail / filters
│   ├── reviewController.js      ← product reviews
│   ├── wishlistController.js    ← user wishlist
│   ├── orderController.js       ← cart checkout → order
│   ├── storeController.js       ← store locator
│   ├── newsletterController.js  ← email capture
│   └── adminController.js       ← admin CRUD for catalog / banners / users / orders
├── routes/                      ← express routers (mounted in server.js)
│   ├── authRoutes.js            /api/auth/*
│   ├── userRoutes.js            /api/users/*
│   ├── homeRoutes.js            /api/categories, /api/banners, /api/offers, …
│   ├── productRoutes.js         /api/products/*
│   ├── storeRoutes.js           /api/stores/*
│   ├── orderRoutes.js           /api/orders/*
│   ├── newsletterRoutes.js      /api/newsletter/*
│   └── adminRoutes.js           /api/admin/*
├── uploads/                     ← multer drop zone (served at /uploads)
└── utils/                       ← mailer, helpers
```

## API surface (high level)

| Prefix              | Purpose                                              |
|---------------------|------------------------------------------------------|
| `GET  /api/health`  | Liveness check                                       |
| `/api/auth`         | Unified login (role in token decides post-login UX)  |
| `/api/users`        | Customer profile, addresses, wishlist                |
| `/api/products`     | Catalog browse / detail / reviews                    |
| `/api/stores`       | Store locator (pincode + filters)                    |
| `/api/orders`       | Checkout + order history                             |
| `/api/newsletter`   | Subscribe                                            |
| `/api/admin/*`      | Admin-only CRUD (guarded by `adminAuthMiddleware`)   |
| `/api/categories`, `/api/banners`, `/api/offers`, `/api/featured`, `/api/deal`, `/api/nav-categories` | Home-page data feeds |

Static files uploaded via the admin panel are served from `/uploads/*`.

## How auth works

- One login endpoint (`POST /api/auth/login`) — the response includes the
  user's role. The frontend uses that role to decide whether to land on
  `/account` or `/admin`.
- Customer and admin tokens are signed with **different** secrets so a
  compromised customer token can never be used to hit admin routes.
- The token is sent by the client as `Authorization: Bearer <token>`.
- `middleware/authMiddleware.js` validates customer tokens;
  `middleware/adminAuthMiddleware.js` validates admin tokens.

## File uploads

Admin image uploads go through `multer` and land in `backend/uploads/` on disk.
The directory is gitignored except for a `.gitkeep` so the folder always exists.
In production, point a persistent volume (or S3 + a pre-signed URL scheme) at
this path.

## Production notes

- Set long, unique values for `JWT_SECRET` and `JWT_ADMIN_SECRET`.
- Set `CLIENT_ORIGIN` to the real frontend URL (not `*`).
- Put the API behind HTTPS.
- Back up MongoDB. Rotate the JWT secrets to sign out every session if needed.
- The seeded demo admin password is **public in this repo** — rotate it
  immediately on any shared environment.

## Troubleshooting

| Symptom                               | Likely fix                                    |
|---------------------------------------|-----------------------------------------------|
| `MongoServerError: bad auth`          | Check `MONGO_URI` user / password             |
| `CORS error` from the browser         | Set `CLIENT_ORIGIN` to the frontend URL       |
| `EADDRINUSE :::3001`                  | Another process is on 3001 — change `PORT`    |
| OTP emails never arrive               | Verify `SMTP_*` creds, check provider logs    |
| Uploaded images 404 after deploy      | `uploads/` isn't persisted — mount a volume   |
