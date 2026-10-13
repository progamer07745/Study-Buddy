# Study Buddy PWA deployment

The React app is installable as a Progressive Web App from supported browsers. Cloudflare Pages serves the UI, manifest, icons, and service worker. Pages Functions forward `/auth/*`, `/tasks/*`, `/users/*`, `/leaderboard`, `/notifications/*`, and `/health` to the backend. This is a same-origin proxy; the API itself remains the Vercel backend. The default target is the current Vercel URL below, and a Pages runtime variable named `API_ORIGIN` overrides it when the backend moves.

Optional: set `API_ORIGIN` in Cloudflare Pages for Production (and Preview if needed), for example:

```text
https://study-buddy-backend-pi.vercel.app
```

Users install from the browser menu. New frontend deployments update the installed PWA when its service worker checks for a new version; users do not reinstall it.

Notification controls are available to signed-in users. Push requires the backend VAPID settings and the Cloudflare minutely scheduler described in `../backend/notification-worker/README.md`.

For Google login through the same-origin proxy, put `https://study-buddy-ev9.pages.dev` first in the Vercel backend's comma-separated `CLIENT_ORIGIN` allowlist. Preserve any origins still used by native builds, and add `http://localhost:5173` if local login is needed. Set `GOOGLE_CALLBACK_URL` to:

```text
https://study-buddy-ev9.pages.dev/auth/google/callback
```

Register that exact callback URL in the Google OAuth client. See the notification scheduler instructions in `../backend/notification-worker/README.md`.

For notifications, add the three `VAPID_*` values and a shared `NOTIFICATION_CRON_SECRET` to Vercel. Deploy the Worker described in the backend README and set the same secret there. The `API_ORIGIN` Pages variable is optional while the backend remains at the default Vercel URL; set it and redeploy Pages if the backend URL changes.
