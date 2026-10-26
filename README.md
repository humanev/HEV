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

## Importing Humans of EV source content

The WordPress importer reads public, published content from `https://humansofev.info` and preserves the original article link as attribution. It previews counts without changing the database by default:

```powershell
npm run content:import
```

Add `--apply` after reviewing the preview to import the latest 100 News posts, all published EV Events and Magazine posts, and interview articles recognized from the Article category into the local database. It is safe to re-run: article and media entries are deduplicated, the Events section is refreshed from the source, and other sections and unrelated admin content are left unchanged. The importer targets `data/humans-of-ev.sqlite`; review the preview and back up that file before applying changes. Podcast content is imported only when a real podcast/episode or podcast-media embed is published through the source WordPress API. No matching podcast items are currently exposed, so the importer does not create placeholder episodes.

## Admin panel and contact enquiries

The existing `/contact` page now sends validated enquiries to the API instead of displaying a local-only success state. Newsletter subscriptions are also stored through the API and can be reviewed or removed from the admin panel. Administrators can sign in at `/admin`, create/edit/delete newsroom articles, podcast episodes, videos, magazine issues and CXO profiles, publish or save drafts, review contact enquiries and update their status. Videos play inline from public YouTube or Vimeo links, direct MP4, WebM and Ogg URLs, or locally uploaded files. The admin panel accepts podcast audio/video uploads (MP3, M4A, WAV, AAC, OGG, MP4 or WebM), video uploads (MP4, WebM or OGG), and magazine PDF editions, up to 500 MB per media file. Uploaded media is stored in the ignored `data/media` directory and served only while attached to a published item; member-only media requires an active paid membership. Each article, podcast, video, magazine issue and CXO profile can be marked free or active-members-only. Public visitors see a preview and membership prompt for restricted items; their full text and media links are only returned by the API to signed-in members with an active paid membership. Image fields accept an existing HTTP(S) image URL or an uploaded JPEG, PNG, WebP or GIF up to 5 MB. Uploaded images are stored in the ignored `data/uploads` directory and served from `/uploads`.

The primary navigation is a flat, single-level menu for Home, News, EV Intelligence, Vehicles, EV Business, Energy, People, HEV Media, Events and B2B Solutions; each landing page has five main content sections. Shared public pages retain the same header, Contact CTA and footer. The **Website content** admin section also manages the navigation menu and structured content used by the home dashboard, company directory, events, research library, membership plans, investor deals, People highlights, Learning Centre, Community, and home-page feature cards. Changes are stored in SQLite and load on the public site. Paid plan prices update the server-verified Razorpay checkout amount; tier names remain fixed so account and payment behavior stays consistent. A compact Contact CTA is shown on public pages.

Contact enquiries are saved to the admin inbox even when email delivery is unavailable. To enable contact notifications, create a Brevo account, generate a transactional email API key, verify a sender address with Brevo, then set `BREVO_API_KEY`, `EMAIL_FROM`, and optionally `EMAIL_FROM_NAME` in the private `.env` file. `ADMIN_EMAIL` receives enquiry notifications, and the sender receives an acknowledgement. Newsletter subscriptions are saved even if the welcome email cannot be delivered; the form reports the welcome email status. Restart `npm run server` after changing the settings. Keep the API key private and never put it in frontend code or send it in chat. Provider account approval, sender verification, and any current sending limits are managed by Brevo.

## Member accounts and paid membership

Members can register and sign in at `/account`. New registrations create a free account. The account page shows the current membership, account details and renewal date; signed-in members can choose a Professional or Executive plan. Paid checkout creates a Razorpay order on the server, verifies Razorpay's signature, confirms the payment with Razorpay, and activates the plan for one month only after Razorpay reports the payment as captured. Renewals are manual; payments extend an unexpired membership by a month. Enterprise membership is handled through the contact page.

To enable paid checkout, create Razorpay API keys in the Razorpay dashboard and add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to the private `.env` file. Use Razorpay test-mode keys until production is ready; never put the secret key in frontend code, commit it, or send it in chat. Restart `npm run server` after updating `.env`. Without keys, free member signup/login still works and the account page clearly disables paid checkout.

Admin sessions use HTTP-only, same-site cookies backed by SQLite. The API uses CSRF tokens, rate limits for login/contact, content validation and password hashing. Use HTTPS and a strong, private `SESSION_SECRET` in production. On first start, provide `ADMIN_EMAIL` and an `ADMIN_PASSWORD` of at least 12 characters to create the owner account. Admin signup is available from `/admin` only with the private `ADMIN_SIGNUP_CODE` configured in `.env`; set it to a random value at least 24 characters long and share it only with people you authorize. New accounts must provide this code and a password of at least 12 characters. Without the code configured, admin signup stays disabled. Signed-in administrators can manage recovery contacts and change their password from **Admin profile & security**. Recovery email and phone numbers must be verified with one-time codes before password recovery can use them; recovery codes expire after 10 minutes, allow five attempts, and reset passwords revoke active admin sessions.

Email recovery uses the Brevo settings above. To enable phone verification and recovery, configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER` in `.env` with a Twilio account and SMS-capable sender number in E.164 format. Keep provider credentials private. Phone recovery remains unavailable until all three settings are valid.

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

Admin-managed articles, contact submissions, and website content are stored in SQLite. Initial structured website defaults are loaded from `src/data.js`; newsroom articles are provided only by the API and imported or managed through `/admin`.

## Notes

Page layouts and some explanatory copy remain implemented in React. Social sign-in, password-reset email delivery, live analytics, AI services, search indexing and enterprise integrations still require additional provider/API integration.
