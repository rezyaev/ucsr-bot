# UCSR Bot

A telegram bot for tracking how many times each player won a hltv fantasy for csgo tournaments.

## Requirements

This bot requires [deno runtime](https://deno.land/) to run.

## Local Development

1. You need PostgreSQL database running somewhere (e.g. on [railway](https://railway.app))
2. Get token for your bot from [BotFather](https://telegram.me/BotFather)
3. Create `.env` file and put `PORT`, `DATABASE_URL` and `BOT_TOKEN` variables.
4. Run `deno --allow-all src/index.ts`
5. Use [ngrok](https://ngrok.com/) to put your localhost on the internet.
6. Setup a webhook by requesting `https://api.telegram.org/bot<token>/setWebhook?url=<url>?secret=<token>`
