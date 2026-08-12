# Clockify Daily Report

A simple Node.js tool that fetches your Clockify time entries for any date, groups them by task description, calculates the total time, and generates a clean daily report.

## Features

- Fetch Clockify time entries for any date.
- Group time by task description.
- Automatically calculate hours spent on each task.
- Calculate total hours for the selected date.
- Automatically retrieve your Clockify User ID and Workspace ID.
- Uses Asia/Kolkata (IST) by default.
- Does not send anything to WhatsApp.

## Requirements

- Node.js installed.
- A Clockify account.
- A Clockify API key.

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/clockify-daily-report.git
cd clockify-daily-report
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env`

Create a file named `.env` in the project root.

Add your Clockify API key:

```env
CLOCKIFY_API_KEY=YOUR_CLOCKIFY_API_KEY
TIMEZONE=Asia/Kolkata
```

You do not need to manually add your Clockify User ID or Workspace ID.

## Get your Clockify API Key

Watch this video to see how to generate a Clockify API key:

[Watch: How to get your Clockify API Key](https://www.awesomescreenshot.com/video/55485138?key=dafead1c9b482a1b024acdda40934882)

Copy the generated API key and add it to `.env`:

```env
CLOCKIFY_API_KEY=your_api_key_here
```

**Never share your API key or commit your `.env` file to GitHub.**

## Automatically Get User ID & Workspace ID

Once your API key is added to `.env`, run:

```bash
node setup.js
```

The setup script will automatically:

1. Connect to Clockify using your API key.
2. Retrieve your Clockify User ID.
3. Retrieve your active Workspace ID.
4. Save both values to `.env`.

You should see:

```text
Fetching your Clockify account information...

Setup complete!

User ID:      xxxxxxxxxxxxxxxxx
Workspace ID: xxxxxxxxxxxxxxxxx

Your .env has been updated.
```

Your `.env` will then look like:

```env
CLOCKIFY_API_KEY=your_api_key_here
CLOCKIFY_WORKSPACE_ID=xxxxxxxxxxxxxxxxx
CLOCKIFY_USER_ID=xxxxxxxxxxxxxxxxx
TIMEZONE=Asia/Kolkata
```

You don't need to find either ID manually.

## Generate a Daily Report

Run:

```bash
npm start
```

The application will ask:

```text
Enter date (YYYY-MM-DD):
```

For example:

```text
Enter date (YYYY-MM-DD): 2026-08-11
```

The application will fetch the Clockify entries for **11 August 2026** and generate a report.

Example:

```text
Good morning everyone

Date: Tue, Aug 11, 2026

openCode Ai AWG add to cart: 3.14 hours
openCode Ai: 0.02 hours
code review with AI: 1.85 hours
Code Review - 8.01 Homepage Auto Selecting the Location: 1.25 hours
Show the sidecart on mobile upon adding a product to the cart: 0.15 hours

Total: 6.40 hours
```

## Date Format

Always use:

```text
YYYY-MM-DD
```

Example:

```text
2026-08-11
```

The application uses **Asia/Kolkata (IST)** for date boundaries by default.

## Security

Never commit `.env` to GitHub.

Your `.env` contains your Clockify API key.

The repository should contain:

```text
.env.example
```

but should **not** contain:

```text
.env
```

Make sure `.gitignore` contains:

```gitignore
.env
node_modules/
```

If an API key is accidentally pushed to GitHub, revoke it from Clockify and generate a new one immediately.

## WhatsApp

This project currently **only generates the report**.

It does not automatically send messages to WhatsApp.

WhatsApp delivery can be added separately in the future.
