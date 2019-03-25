const fetch = require('node-fetch');
const { Command } = require('discord-akairo');
const { DaydreamEmbed } = require('../../index');

class XkcdCommand extends Command {
	constructor() {
		super('xkcd', {
			aliases: ['xkcd', 'kxcd', 'xkdc', 'kxdc'],
			description: {
				content: 'Display xkcd comic, latest if used without arguments',
				usage: '[number]'
			},
			cooldown: 5000,
			ratelimit: 2,
			args: [
				{
					'id': 'n',
					'type': 'number',
					'default': 0
				}
			]
		});
	}

	async buildEmbed({ num, title, img, alt }, guild) {
		const explainURL = `https://www.explainxkcd.com/wiki/index.php/${num}`;
		const res = await fetch(explainURL);

		const embed = new DaydreamEmbed()
			.setTitle(`xkcd #${num}`)
			.setDescription(`Title: ${title}${res.status === 200 ? `\nExplain: ${explainURL}` : ''}`)
			.setImage(img)
			.setURL(`https://xkcd.com/${num}/`)
			.setFooter(alt);
		if (!embed.color && guild && guild.me.displayColor) {
			embed.setColor(guild.me.displayColor);
		}

		return embed;
	}

	async exec(msg, { n, explain }) {
		const url = `http://xkcd.com/${n ? `${n}/` : ''}info.0.json`;
		try {
			const res = await fetch(url);
			if (res.status === 404) {
				if (!n) {
					return msg.util.send('✘ xkcd not found.');
				}
				if (msg.util.lastResponse) {
					msg.util.lastResponse.reactions.removeAll();
				}
				return msg.util.send(`✘ Invalid xkcd: #${n}`);
			}
			const json = await res.json();
			n = json.num;
			const answer = await msg.util.send(await this.buildEmbed(json, msg.guild));
			const reactions = ['⬅', '➡'];
			for (const r of reactions) {
				await answer.react(r);
			}
			const filter = (reaction, user) => user.id === msg.author.id && reactions.includes(reaction.emoji.name);
			try {
				const coll = await answer.awaitReactions(filter, { max: 1, time: 30000, errors: ['time'] });
				if (coll.first().emoji.name === '⬅') {
					await coll.first().users.remove(msg.author);
					return await this.exec(msg, { n: n - 1, explain });
				}
				if (coll.first().emoji.name === '➡') {
					await coll.first().users.remove(msg.author);
					await this.exec(msg, { n: n + 1, explain });
				}
			} catch (_) {
				await answer.reactions.removeAll();
			}
		} catch (err) {
			this.client.logger.warn(`xkcd error: ${err}`);
			return msg.util.send('✘ Something went wrong.');
		}
	}
}
module.exports = XkcdCommand;
