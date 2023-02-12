import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Bot, webhookCallback } from "https://deno.land/x/grammy@v1.14.1/mod.ts";
import { format } from "https://deno.land/std@0.177.0/datetime/mod.ts";
import { Database } from "./database.types.ts";

console.log("UCSR Bot is running...");

const supabase = createClient<Database>("https://tbympouurznyzuqonorf.supabase.co", Deno.env.get("SUPABASE_KEY")!);
const bot = new Bot(Deno.env.get("BOT_TOKEN")!);

await bot.api.setMyCommands([
	{ command: "showfantasywins", description: "Показать кто сколько раз выиграл в fantasy" },
	{ command: "addfantasywin", description: "Добавить победу в fantasy" },
	{ command: "showtournaments", description: "Показать доступные турниры" },
]);

bot.command("showfantasywins", async (ctx) => {
	const { data: members, error: membersError } = await supabase.from("Members").select("*");
	if (!members || membersError) {
		return ctx.reply(`Не удалось загрузить игроков`);
	}

	const { data: tournaments, error: tournamentsError } = await supabase.from("Tournaments").select("*");
	if (!tournaments || tournamentsError) {
		return ctx.reply(`Не удалось загрузить турниры`);
	}

	return ctx.reply(
		members
			.map(({ id, ...rest }) => ({
				winCount: tournaments.filter(({ fantasy_winner }) => fantasy_winner === id).length,
				...rest,
			}))
			.sort((a, b) => b.winCount - a.winCount)
			.map(({ telegram_username, winCount }) => `@${telegram_username}: ${winCount}`)
			.join("\n")
	);
});

bot.command("addfantasywin", async (ctx) => {
	const match = ctx.match.match(/@(\w+)\s+"([\w\s\-]+)"/);
	if (!match) {
		return ctx.reply('Неправильно введены аргументы. Должно быть так: /addfantasywin @username "event name"');
	}
	const [_, telegramUsername, tournamentName] = match;

	const { data: members, error: membersError } = await supabase
		.from("Members")
		.select("id, telegram_username")
		.eq("telegram_username", telegramUsername);
	if (!members || membersError) {
		return ctx.reply(`Не удалось найти @${telegramUsername}`);
	}
	const winner = members[0];

	const { data: tournaments, error: tournamentsError } = await supabase
		.from("Tournaments")
		.select("*")
		.eq("name", tournamentName);
	if (!tournaments || tournaments.length !== 1 || tournamentsError) {
		return ctx.reply(`Не удалось найти ${tournamentName}`);
	}
	const tournament = tournaments[0];

	if (tournament.fantasy_winner !== null) {
		return ctx.reply(`У <b>${tournament.name}</b> уже есть победитель!`, { parse_mode: "HTML" });
	}

	const { data: updatedTournaments, error: updatedTournamentsError } = await supabase
		.from("Tournaments")
		.update({ fantasy_winner: winner.id })
		.eq("name", tournamentName)
		.select();
	if (!updatedTournaments || updatedTournaments.length !== 1 || updatedTournamentsError) {
		return ctx.reply(`Не удалось обновить ${tournamentName}`);
	}

	return ctx.reply(
		`Поздравляю, @${winner.telegram_username}! Ты разъебал нубасиков и выиграл <b>${tournament.name} Fantasy</b>!`,
		{ parse_mode: "HTML" }
	);
});

bot.command("showtournaments", async (ctx) => {
	const { data: tournaments, error } = await supabase.from("Tournaments").select("*");
	if (!tournaments || error) {
		return ctx.reply("Не удалось загрузить турниры");
	}

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

const handleUpdate = webhookCallback(bot, "std/http");
serve(async (req) => {
	try {
		console.log("Got request", req);

		const url = new URL(req.url);
		if (url.searchParams.get("secret") !== bot.token) {
			return new Response("not allowed", { status: 405 });
		}

		return await handleUpdate(req);
	} catch (err) {
		console.error(err);
	}
});
