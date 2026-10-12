# Humans of EV 5.0 — React, Vite and Express

## Run locally

Install dependencies once:

```bash
npm install
```

Create your local environment file and set a unique session secret and admin password. The password must contain at least 12 characters:

```powershell
Copy-Item .env.example .env
```

Edit `.env` before starting the server. Never commit `.env`; it is ignored by Git.

Run the API and frontend in separate terminals:

```bash
npm run server
npm run dev
```

Open the Vite URL shown in the frontend terminal. The admin panel is at `/admin`; the first server start creates the account configured by `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Later password changes require an administrator account-management flow, which is not included yet.

The API uses SQLite in `data/humans-of-ev.sqlite`. Back up this file to preserve the article library, contact enquiries and admin account. Node.js 20.6 or newer is required.

## Local demo mode (fake service integrations)

For UI testing without real email or payment providers, run `npm run server:demo` and `npm run dev:demo` in separate terminals. Open `http://127.0.0.1:5174`. This uses a separate `data/demo` database, binds the API to `127.0.0.1:3018`, seeds sample news, podcasts, magazine issues, CXO profiles, enquiries and a newsletter subscriber, and enables the normal local content/admin/member APIs against that sample database. Create and edit operations work but affect only demo data.

Create a private demo environment file before the first run. Never commit the resulting `.env.demo` file:

```powershell
Copy-Item .env.demo.example .env.demo
```

Set your own local demo credentials and session secret in `.env.demo`, then use those credentials at `/admin` and `/account`. Paid membership checkout, contact email, and newsletter welcome email are simulated locally. No external provider is called and no money or email is sent. Demo mode must only be used locally; the regular `npm run server` mode and production payment/email behavior are unchanged.

## Importing Humans of EV source content

The WordPress importer reads public, published content from `https://humansofev.info` and preserves the original article link as attribution. It previews counts without changing the database by default:

```powershell
npm run content:import -- --target=demo
```

Add `--apply` after reviewing the preview to import the latest 100 News posts, all published EV Events and Magazine posts, and interview articles recognized from the Article category into the local demo database. It is safe to re-run: article and media entries are deduplicated, the Events section is refreshed from the source, and other sections and unrelated admin content are left unchanged. `--target=main` selects the regular local database; review the preview and back up `data/humans-of-ev.sqlite` before using it. Podcast content is imported only when a real podcast/episode or podcast-media embed is published through the source WordPress API. No matching podcast items are currently exposed, so the importer does not create placeholder episodes.

## Admin panel and contact enquiries

The existing `/contact` page now sends validated enquiries to the API instead of displaying a local-only success state. Newsletter subscriptions are also stored through the API and can be reviewed or removed from the admin panel. Administrators can sign in at `/admin`, create/edit/delete newsroom articles, podcast episodes, videos, magazine issues and CXO profiles, publish or save drafts, review contact enquiries and update their status. Videos play inline from public YouTube or Vimeo links, or direct MP4, WebM and Ogg URLs. Each article, podcast, video, magazine issue and CXO profile can be marked free or active-members-only. Public visitors see a preview and membership prompt for restricted items; their full text and media links are only returned by the API to signed-in members with an active paid membership. Image fields accept an existing HTTP(S) image URL or an uploaded JPEG, PNG, WebP or GIF up to 5 MB. Uploaded images are stored in the ignored `data/uploads` directory and served from `/uploads`.

The primary navigation is a flat, single-level menu for Home, Latest News, EV Intelligence, Vehicles, EV Business, Energy, People, HEV Media, Events and B2B Solutions; each landing page has five main content sections. Shared public pages retain the same header, Contact CTA and footer. The **Website content** admin section also manages the navigation menu and structured content used by the home dashboard, company directory, events, research library, membership plans, investor deals, People highlights, Learning Centre, Community, and home-page feature cards. Changes are stored in SQLite and load on the public site. Paid plan prices update the server-verified Razorpay checkout amount; tier names remain fixed so account and payment behavior stays consistent. A compact Contact CTA is shown on public pages.

Contact enquiries are saved to the admin inbox even when email delivery is unavailable. To enable contact notifications, create a Brevo account, generate a transactional email API key, verify a sender address with Brevo, then set `BREVO_API_KEY`, `EMAIL_FROM`, and optionally `EMAIL_FROM_NAME` in the private `.env` file. `ADMIN_EMAIL` receives enquiry notifications, and the sender receives an acknowledgement. Newsletter signup sends a welcome email before confirming the subscription; it reports an error rather than claiming success if delivery fails. Restart `npm run server` after changing the settings. Keep the API key private and never put it in frontend code or send it in chat. Provider account approval, sender verification, and any current sending limits are managed by Brevo.

## Member accounts and paid membership

Members can register and sign in at `/account`. New registrations create a free account. The account page shows the current membership, account details and renewal date; signed-in members can choose a Professional or Executive plan. Paid checkout creates a Razorpay order on the server, verifies Razorpay's signature, confirms the payment with Razorpay, and activates the plan for one month only after Razorpay reports the payment as captured. Renewals are manual; payments extend an unexpired membership by a month. Enterprise membership is handled through the contact page.

To enable paid checkout, create Razorpay API keys in the Razorpay dashboard and add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to the private `.env` file. Use Razorpay test-mode keys until production is ready; never put the secret key in frontend code, commit it, or send it in chat. Restart `npm run server` after updating `.env`. Without keys, free member signup/login still works and the account page clearly disables paid checkout.

Admin sessions use HTTP-only, same-site cookies backed by SQLite. The API uses CSRF tokens, rate limits for login/contact, content validation and password hashing. Use HTTPS and a strong, private `SESSION_SECRET` in production. On the first start only, provide a valid `ADMIN_EMAIL` and an `ADMIN_PASSWORD` of at least 12 characters.

## Architecture

- `src/App.jsx` — public application shell and routes.
- `src/AdminPanel.jsx` / `src/admin.css` — authenticated admin interface.
- `src/api.js` — same-origin API and CSRF-aware request helper.
- `src/data.js` — mock data for non-editorial platform modules.
- `src/index.css` — public responsive visual system.
- `server/index.js` — Express API, SQLite schema, admin authentication and content/enquiry endpoints.
- `vite.config.js` — development proxy from `/api` to the local Express server.

## Included routes

Home, News, Article, Intelligence, Dashboard, People, Startup Hub, Company Directory, Investors, Research, Magazine, Podcasts, Videos, Events, Awards, Learning Centre, Community, Membership, Account, Search, Newsletter, Contact and `/admin`.

## Customisation

Admin-managed articles, contact submissions, and website content are stored in SQLite. Initial structured content is seeded from `src/data.js`; subsequent edits are database-backed and managed at `/admin`.

## Notes

Page layouts and some explanatory copy remain implemented in React. Social sign-in, password-reset email delivery, live analytics, AI services, search indexing and enterprise integrations still require additional provider/API integration.
