import { format } from "https://deno.land/std@0.178.0/datetime/mod.ts";
import { serve } from "https://deno.land/std@0.178.0/http/server.ts";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";
import { Bot, webhookCallback } from "https://deno.land/x/grammy@v1.14.1/mod.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const bot = new Bot(Deno.env.get("BOT_TOKEN")!);
await bot.api.setMyCommands([
	{ command: "showfantasywins", description: "Показать кто сколько раз выиграл в fantasy" },
	{ command: "addfantasywin", description: "Добавить победу в fantasy" },
	{ command: "showtournaments", description: "Показать доступные турниры" },
]);

const client = new Client(Deno.env.get("DATABASE_URL")!);
const handleUpdate = webhookCallback(bot, "std/http");

serve(
	async (request) => {
		try {
			if (new URL(request.url).searchParams.get("secret") !== bot.token) {
				return new Response("not allowed", { status: 405 });
			}

			await client.connect();
			return await handleUpdate(request);
		} catch (err) {
			console.error(err);
			await client.end();
		}
	},
	{ port: parseInt(Deno.env.get("PORT")!) }
);

type Member = {
	id: number;
	telegramUsername: string;
	steamUsername: string;
};

type Tournament = {
	id: number;
	name: string;
	start: string;
	finish: string;
	fantasyWinner: number;
};

bot.command("showfantasywins", async (ctx) => {
	const { rows: members } = await client.queryObject<Member>`SELECT * FROM members`;
	const { rows: tournaments } = await client.queryObject<Tournament>`SELECT * FROM tournaments`;

	return ctx.reply(
		members
			.map(({ id, ...rest }) => ({
				winCount: tournaments.filter(({ fantasyWinner }) => fantasyWinner === id).length,
				...rest,
			}))
			.sort((a, b) => b.winCount - a.winCount)
			.map(({ telegramUsername, winCount }) => `@${telegramUsername}: ${winCount}`)
			.join("\n")
	);
});

bot.command("addfantasywin", async (ctx) => {
	const match = ctx.match.match(/@(\w+)\s+"([\w\s\-]+)"/);
	if (!match) {
		return ctx.reply('Неправильно введены аргументы. Должно быть так: /addfantasywin @username "event name"');
	}
	const [_, telegramUsername, tournamentName] = match;

	const winner = (await client.queryObject<Member>`SELECT * FROM members WHERE telegramUsername = ${telegramUsername}`)
		.rows[0];
	const wonTournament = (await client.queryObject<Tournament>`SELECT * FROM tournaments WHERE name = ${tournamentName}`)
		.rows[0];

	if (wonTournament.fantasyWinner !== null) {
		return ctx.reply(`У <b>${wonTournament.name}</b> уже есть победитель!`, { parse_mode: "HTML" });
	}

	await client.queryObject<Tournament>`UPDATE tournaments SET fantasyWinner = ${winner.id} WHERE name = ${tournamentName}`;

	return ctx.reply(
		`Поздравляю, @${winner.telegramUsername}! Ты разъебал нубасиков и выиграл <b>${wonTournament.name} Fantasy</b>!`,
		{ parse_mode: "HTML" }
	);
});

bot.command("showtournaments", async (ctx) => {
	const { rows: tournaments } = await client.queryObject<Tournament>`SELECT * FROM tournaments`;

	return ctx.reply(
		tournaments
			.map(({ start, finish, ...rest }) => ({ start: new Date(start), finish: new Date(finish), ...rest }))
			.sort((a, b) => b.start.getTime() - a.start.getTime())
			.map(
				({ name, start, finish }) => `${format(start, "dd.MM.yyyy")} - ${format(finish, "dd.MM.yyyy")} <b>${name}</b>`
			)
			.join("\n"),
		{ parse_mode: "HTML" }
	);
});
