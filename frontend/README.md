# HP World Frontend — myhpworld.com

React + Vite + Tailwind e-commerce frontend.

## Prerequisites
- Node.js **18+** installed → https://nodejs.org
- npm (bundled with Node) or yarn

## Run locally (3 commands)

```bash
cd frontend
npm install
npm run dev
```

Then open → **http://localhost:5173**

The app runs standalone with mock data when the backend is offline. When the
API in [../backend](../backend) is running on port `3001`, Vite proxies
`/api` and `/uploads` to it automatically (see `vite.config.js`).

## Production build

```bash
npm run build     # outputs ./dist — ready to deploy to Vercel/Netlify/any static host
npm run preview   # preview the built site locally
```

## Project structure

```
frontend/
├── index.html                    ← HTML shell (Google Fonts loaded here)
├── package.json
├── vite.config.js                ← dev server + /api proxy → localhost:3001
├── tailwind.config.js            ← HP brand colors, fonts, animations
├── postcss.config.js
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx                  ← React entry — mounts Router + CartProvider
    ├── App.jsx                   ← All routes
    ├── index.css                 ← Tailwind + custom classes (hero-gradient, btn-primary, etc.)
    ├── components/
    │   ├── layout/               ← AnnouncementBar, Navbar, Footer, TrustMarquee
    │   ├── home/                 ← HeroCarousel, CategoryGrid, OfferStrip,
    │   │                           DealOfTheDay, FeaturedProducts, BrandRibbon,
    │   │                           StoreLocatorCTA, WhyHpWorld, Newsletter
    │   └── common/               ← ProductCard, CountdownTimer
    ├── pages/
    │   ├── Home.jsx              ← composes all home sections
    │   ├── ProductListing.jsx    ← /shop and /shop/:category
    │   ├── ProductDetail.jsx     ← /product/:id
    │   ├── Cart.jsx              ← /cart
    │   ├── Checkout.jsx          ← /checkout (multi-step form)
    │   ├── StoreLocator.jsx      ← /stores (pincode search + filters + 9 demo stores)
    │   ├── Login.jsx             ← /login
    │   ├── Register.jsx          ← /register
    │   ├── Account.jsx           ← /account (orders, wishlist, profile)
    │   └── NotFound.jsx          ← 404
    ├── context/
    │   └── CartContext.jsx       ← global cart + localStorage persistence
    ├── services/
    │   └── api.js                ← axios client + endpoint wrappers
    └── data/
        └── mockData.js           ← fallback data used when backend is offline
```

## Environment variables (optional)

Copy [.env.example](.env.example) to `.env` if you want to point at a
deployed backend:

```bash
cp .env.example .env
# then set VITE_API_URL=https://api.myhpworld.com
```

Without this, the app uses `/api` (proxied to `localhost:3001` in dev).

## Routes

| Path | Component |
|------|-----------|
| `/` | Home (all sections) |
| `/shop` | Product listing (all) |
| `/shop/:category` | Product listing (filtered) |
| `/product/:id` | Product detail |
| `/cart` | Cart |
| `/checkout` | Checkout |
| `/stores` | Store locator (supports `?pincode=XXXXXX`) |
| `/login` | Login |
| `/register` | Register |
| `/account` | Account dashboard |

## Notes

- **Mock data** (`src/data/mockData.js`) is used as a fallback everywhere — the app works fully without the backend running.
- **Cart** persists in `localStorage` under `myhpworld_cart_v1`.
- **Auth token** is stored in `localStorage` under `myhpworld_token` and attached to every API request.
- **Icons** are from `lucide-react` (consistent with the design baseline).
- **Fonts** are Bricolage Grotesque (display) + DM Sans (body), loaded from Google Fonts.
