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

## WhatsApp

WhatsApp delivery is intentionally not included in this starter because the correct implementation depends on whether you are using:
- the official WhatsApp Business Platform, or
- an existing personal WhatsApp account/group.

Do not automate a personal WhatsApp session until the delivery method is decided.
