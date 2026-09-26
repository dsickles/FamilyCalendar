# Family Wall Dashboard

An **ad-free and zero-subscription family kiosk**: a modular, touch-first, full-screen PWA that a household can glance at from about three feet. Think Cozi or DAKboard, without a monthly bill.

This is a wall appliance, not a general website and not a SaaS product. A public clone boots **demo mode** with sample events. A live install (Docker on a NAS, or optionally Vercel) loads private ICS calendars and local weather **behind the same PIN-gate**. After unlock, the wall is view-only until someone explicitly locks it. Idle time returns the calendar to the month grid. It does not bring back the PIN.

**Public demo:** https://familycalendar-demo.vercel.app — empty environment, sample events, no PIN. A live family install (PIN and private calendars) is not linked in this README.

## Why it exists

| Intent | Meaning |
|--------|---------|
| Wall appliance | Always-on landscape kiosk (iPad + Guided Access) |
| Family overlay | Multiple calendars: people, shared, utilities, holidays |
| Touch-first | 44×44pt targets, no hover-only UI |
| Zero subscription | Self-hosted; Open-Meteo weather; ICS feeds you already have |
| Portfolio-safe | Public repo + demo data; live family data never in git or client JS |

Primary hardware is an **iPad Air (4th gen, 2020)** in landscape (**1180×820**). The stage also fills **1366×1024** and **1920×1080**. Below 1180 on either edge, that 1180×820 layout scales down. The document does not scroll. The week time grid is the only vertical scroller.

## What you get

- Next.js App Router PWA (standalone, landscape)
- Demo mode when no calendar URLs are configured
- PIN unlock, httpOnly session cookie, rate-limited failures, explicit relock
- ICS fetch, parse, and recurrence expansion on the server
- Weather from Open-Meteo
- Header row: clock, current weather, 3-day forecast, and a lock control on live installs
- Filter chips, a 4-week month grid, week view, and day view
- Idle return to the month grid (a view reset, not a PIN lock)
- `/api/health` for Docker
- Multi-stage `Dockerfile` + Compose

Design and constraints live under [`.spec/`](.spec/).

## Using the wall

The screen opens on a 4-week month grid. The header is the clock, current weather, and a 3-day forecast.

- **Open a day.** Tap a day cell. The day lists that day's events. Chevrons on either side of the date move one day. A sideways swipe on the event list does the same.
- **Open a week.** On the month grid, tap the week control at the left of a row. That Sunday–Saturday week opens, with an hourly grid you can scroll. Chevrons beside the date range move one week. A sideways swipe on the day headers or the all-day band does the same. Scrolling the hour grid does not change the week.
- **Back to 4 weeks.** On a week or a day, tap **4 weeks**. The month grid returns, still anchored on today.
- **Hide a calendar.** Tap a chip in the **Filters** row. That calendar's events drop out of every view until you tap the chip again. The choice sticks while you move between day, week, and 4 weeks.
- **Walk away.** After about 90 seconds with no touch, a week or a day returns to the 4-week grid on its own. The screen does not lock.
- **Lock.** This control exists only after `DASHBOARD_PIN` and at least one calendar URL are set in `.env.local`. Tap the lock icon at the right of the header, then confirm **Lock dashboard?**. The PIN pad comes back. Cancel leaves the wall unlocked. Demo mode has no lock icon. Five wrong PINs from the same device within 15 minutes lock that PIN pad. Further tries, including the right PIN, wait until those 15 minutes are over.

## Getting Started

### Demo on your computer

This is the easiest way to see the wall before you connect a real calendar. You run it on the computer in front of you, open it in a browser, and get sample events for a made-up household (Alex, Jordan, Family, and School). There is no PIN to type and no account to create. Nothing you do here touches a live family calendar.

The same empty-env demo is already online at https://familycalendar-demo.vercel.app (sample events, no PIN).

You will install two free tools, download this project, and start it. If you already have a file named `.env.local` in the folder and it contains a calendar link, set that file aside for now. With a calendar link present, the app expects your real calendars and a PIN instead of this demo.

1. Install **Node.js 20 or newer** from [nodejs.org](https://nodejs.org). Node is what runs the app on your computer. The installer also gives you npm, which downloads the pieces the app needs. Close and reopen your terminal after the installer finishes.
2. Check that it worked. Open a terminal and type `node -v`. You want `v20` or higher. `npm -v` should print a version too.
3. Install **Git** from [git-scm.com](https://git-scm.com) if `git --version` says it is not recognized. Git is how you download the project. If you would rather download a zip from GitHub, you can skip Git.
4. Download the project and open its folder in the terminal:

   ```bash
   git clone https://github.com/dsickles/FamilyCalendar.git
   cd FamilyCalendar
   ```

   If you used a zip instead, unzip it and `cd` into that folder. You are in the right place when the folder contains `package.json`.
5. Leave `.env.local` uncreated for this try. Do not copy `.env.example` yet. That file is for your own calendars, which is the next section.
6. Download the app's pieces. The first time can take a minute.

   ```bash
   npm install
   ```

7. Start it:

   ```bash
   npm run dev
   ```

   Leave this terminal open. The wall is running only while this command is. Ctrl+C stops it.
8. Open [http://localhost:3000](http://localhost:3000) in a browser. You should see the calendar wall, not a PIN pad.
9. Click around using **Using the wall**. Sample calendars are Alex, Jordan, Family, and School. There is no lock icon in the demo.
10. If you want to be sure you are on the demo and not a live calendar, open [http://localhost:3000/api/health](http://localhost:3000/api/health). The page should say `"mode": "demo"`.
11. Optional: try the same demo the way it will run when it is left on, not in the quick preview from step 7. Stop the terminal with Ctrl+C, then:

    ```bash
    npm run build
    npm start
    ```

    Open [http://localhost:3000](http://localhost:3000) again. Still no PIN, as long as you have not added a calendar link.

A PIN by itself, with every calendar link left empty, still shows this demo. The wall switches to your calendars only after at least one calendar URL is filled in.

### Add your own calendar and preferences

You have already seen the sample wall. This step swaps those pretend calendars for yours. You make one private file on your computer. It holds a short PIN and the links to calendars you already have, plus a few choices like your city and whether the clock says AM/PM. That file stays on your machine. It is not part of the public project, so someone else who downloads this app does not get your PIN or your calendars.

1. In the project folder, copy the template.

   Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env.local
   ```

   macOS or Linux:

   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` in a text editor. Lines that start with `#` are comments.
3. Set `DASHBOARD_PIN` to 4–8 digits. This is the code the wall asks for. It is not stored in git.
4. For each calendar, pick a short ALL-CAPS slug with letters and numbers only, such as `FAMILY`. Then set:

   - `CAL_FAMILY_URL` — the ICS feed. It must start with `https://` (or `http://`). A `webcal://` link is the same address with `https://` instead. A Google Calendar page link will not work. In Google Calendar, open that calendar's settings, then **Integrate calendar**, and copy **Secret address in iCal format**.
   - `CAL_FAMILY_LABEL` — the name on the filter chip, in quotes.
   - `CAL_FAMILY_COLOR` — a hex color such as `#10b981`.
   - `CAL_FAMILY_CATEGORY` — one of `person`, `shared`, `utility`, or `external`.

   Repeat with a different slug for the next calendar (`CAL_DINNER_URL`, and so on). An empty URL is ignored. The names already in `.env.example` are examples. You can use them or add new ones.
5. Optional preferences are already filled with defaults in the template. Change them only if you want a different place or clock: `WEATHER_LAT`, `WEATHER_LON`, and `WEATHER_DISPLAY_NAME` for the forecast; `TIMEZONE`; `TEMPERATURE_UNIT` (`fahrenheit` or `celsius`); `TIME_FORMAT` (`12h` or `24h`); `WEEK_START_DAY` (`0` Sunday, `1` Monday); `IDLE_TIMEOUT_MS` (quiet time before a week or day returns to 4 weeks).
6. Save the file. Confirm it is still named `.env.local` in the project folder, next to `package.json`.
7. Do not run `git add .env.local`. It is listed in `.gitignore`. Stop the dev server with Ctrl+C if it is running, then start it again with `npm run dev` so it reads the new file. Open [http://localhost:3000](http://localhost:3000). You should get the PIN pad.

Once a calendar link is saved, the next visit asks for your PIN before it shows anything. After you unlock, the wall stays open until someone taps the lock icon, or until about 30 days have passed. Walking away still returns a week or a day to the 4-week view. It does not ask for the PIN again.

If you want another look at the sample family while this file is in place, stop the app and start it again with `npm run dev`, then open [http://localhost:3000/?demo=1](http://localhost:3000/?demo=1). That preview only works in this local tryout. A deployed wall ignores it.

## Deploy to Production

There are two options to consider when deploying this to production. You can host it on your local network using Docker, or you can use Vercel if you want it to be able to be accessed from outside your local network. Either way, finish **Add your own calendar and preferences** first. That PIN and those calendar links are what the wall uses. They stay on your machine or in Vercel's settings. They do not go into the public project.

### Docker

Docker is a way to run an app without installing the programming tools yourself. You install Docker once. It then runs this dashboard inside a **container**: a private little copy of the app that stays on as long as that computer is on, and starts again after a restart. Your iPad, on the same Wi-Fi, opens that computer in a browser. People outside your house cannot open it, which is the point of this option.

1. Install Docker on the computer that should stay on at home.

   - **Windows or Mac:** install [Docker Desktop](https://www.docker.com/products/docker-desktop/), open it, and wait until it says it is running.
   - **Linux server:** install Docker Engine and Docker Compose. Docker's own install guide for your version of Linux is the safest path.
   - **NAS:** many network drives can run Docker, but each brand hides it in a different app. Search for how Docker is installed on your NAS model, install that, and use the same steps below once Docker is available.

2. Open a terminal (Command Prompt or PowerShell on Windows, Terminal on Mac). Check that Docker is really there:

   ```bash
   docker --version
   docker compose version
   ```

   Each line should print a version. If the computer says the command is not found, close the terminal, open it again, and make sure the Docker app is still running.
3. Put this project on that same computer. If it is not there yet, clone it or copy the folder over. The folder needs `docker-compose.yml` and `Dockerfile` in it. Those files tell Docker how to build the wall.
4. Create `.env.local` **inside that folder**, using **Add your own calendar and preferences**. Docker reads the PIN and calendar links from the folder it is started in. A copy that only exists on your laptop will not be seen.
5. In the terminal, move into that folder. The command is `cd` plus the folder path. You want the prompt sitting in the folder that contains `docker-compose.yml`.
6. Start the wall. The first time, Docker downloads what it needs and builds the app. That can take several minutes. Later starts are quicker.

   ```bash
   docker compose up -d --build
   ```

   You can close the terminal after this. The wall keeps running.
7. Check that it stayed up:

   ```bash
   docker compose ps
   ```

   You want `dashboard` listed as running, and after a minute as healthy. Healthy means the app answered a simple "are you up?" check. If it keeps restarting, run `docker compose logs` and look for a missing `.env.local`.
8. Find the address to type into a browser.

   - On the same computer where Docker is running: [http://localhost:3000](http://localhost:3000)
   - On the iPad or another device on your Wi-Fi: the computer's address on your network, such as `http://192.168.1.20:3000`. On Windows, run `ipconfig` and use the IPv4 address. On a Mac, look in System Settings → Network. On a NAS, the address is usually on its own status screen.

9. Open that address. You should see the PIN pad, not the sample Alex and Jordan calendars. Enter the PIN you saved in `.env.local`. Your calendars should appear.
10. Optional peace-of-mind check: open `http://<that-same-address>:3000/api/health`. You should see `"mode": "live"`. That page only says the app is up. It does not show your events, and it does not ask for the PIN.
11. On the iPad, open the address from step 8 in Safari and unlock once. Tap Share → **Add to Home Screen** so it opens like an app. Then turn on **Settings → Accessibility → Guided Access**, start it on the dashboard, and set Auto-Lock to Never so the screen stays on.
12. Do not open port 3000 on your router. If you do, the rest of the internet can try to reach the wall. Away from home, use Vercel instead.

When you need it later:

- See what went wrong: `docker compose logs -f` (Ctrl+C leaves the wall running)
- After you download a newer copy of the project: `docker compose up -d --build`
- Turn it off: `docker compose down` (your `.env.local` file stays)

### Vercel

Vercel hosts the website for you. You connect the project, and Vercel builds it and gives you a link that works from any network, including a phone away from home. You do not leave a computer running. Vercel has a free tier that is enough for a single family wall. The PIN screen is still required on that live install, so it is separate from the public demo linked above. Do not put that live family link in this README.

1. The project needs to live on GitHub. Vercel copies it from there. If you use GitHub, do not upload `.env.local`. Your PIN and calendar links are typed into Vercel in a later step instead.
2. Go to [vercel.com](https://vercel.com) and create an account. Choose **Continue with GitHub** so Vercel can see your repositories. Approve that access when GitHub asks.
3. On the Vercel home screen, click **Add New… → Project**.
4. Find this repository and click **Import**. If the list is empty, click **Adjust GitHub App Permissions**, allow this repository, and come back to Import.
5. Leave the suggested settings as they are. Vercel should already recognize it as a Next.js app, with install `npm install` and build `npm run build`. Do not fill in an Output Directory. Those defaults are already what this project expects.
6. Before you deploy, open **Environment Variables**. This is the private place for the same values as `.env.local`. Add one row at a time, and choose **Production** (also choose Preview if you want test links protected the same way):

   - `DASHBOARD_PIN` — the 4–8 digit code your family will type
   - each calendar's `CAL_<ID>_URL`, `CAL_<ID>_LABEL`, `CAL_<ID>_COLOR`, and `CAL_<ID>_CATEGORY`

   Follow the same link rules as **Add your own calendar and preferences**. Paste `https://` links only. A `webcal://` link will not load.
7. Click **Deploy** and wait. The first build takes a few minutes. When it says Ready, Vercel shows you a link that ends in `.vercel.app`.
8. Open that link. You should get the PIN pad. Enter the PIN from step 6. Your calendars should show, not the sample ones.
9. Optional check: open `https://<your-project>.vercel.app/api/health`. You should see `"mode": "live"`. That page does not list events.
10. If you later change a PIN or a calendar link, update it under **Project → Settings → Environment Variables**. Then open **Deployments**, open the menu on the latest one, and choose **Redeploy**. The live site keeps the old values until you redeploy.
11. Optional extra lock: **Project → Settings → Deployment Protection**. That asks someone to sign in to Vercel before the wall even loads. Family members who do not have a Vercel account would be stuck, so leave this off unless you want that second door. It does not replace `DASHBOARD_PIN`. The PIN screen is still what your household uses.
12. On an iPad away from home, open the Vercel link in Safari, unlock, then Add to Home Screen and Guided Access the same way as in the Docker steps. Walking away still returns the calendar to the 4-week view. It does not ask for the PIN again.

## Stack

Next.js (App Router, standalone output), React 19, TypeScript, Tailwind CSS v4, Framer Motion, Lucide, `node-ical`, SWR, Open-Meteo (no API key).

## Spec Kit

| Doc | Path |
|-----|------|
| Constitution | [`.spec/constitution.md`](.spec/constitution.md) |
| Project context | [`.spec/project.md`](.spec/project.md) |

## License

Private family appliance source, published as a public portfolio repo. The public demo (empty environment, sample events, no PIN) is https://familycalendar-demo.vercel.app. A live family install is not linked from here on purpose.
