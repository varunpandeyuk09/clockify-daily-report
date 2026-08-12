# Clockify Daily Report

This project:
1. Fetches yesterday's Clockify time entries.
2. Groups time by description.
3. Calculates the total.
4. Prints the formatted report.
5. Runs automatically every day at 09:30 Asia/Kolkata by default.

## Setup

```bash
npm install
```

Copy `.env.example` to `.env`:

```bash
copy .env.example .env
```

Fill in:

- `CLOCKIFY_API_KEY`
- `CLOCKIFY_WORKSPACE_ID`
- `CLOCKIFY_USER_ID`

Do NOT commit `.env`.

## Test manually

```bash
npm run test-report
```

This only generates the report. It does NOT send WhatsApp messages.

## Run the scheduler

```bash
npm start
```

Keep this process running. If the machine is shut down, the scheduler cannot execute.

## How to get Clockify API key

watch this video : [video](https://www.awesomescreenshot.com/video/55485138?key=dafead1c9b482a1b024acdda40934882)
