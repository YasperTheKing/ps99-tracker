import "dotenv/config";
import { Client, GatewayIntentBits, Events, EmbedBuilder } from "discord.js";
import { TitanicTracker } from "./tracker.js";
import * as hatchrate from "./commands/hatchrate.js";
import * as titanics from "./commands/titanics.js";

const { DISCORD_TOKEN, ANNOUNCE_CHANNEL_ID } = process.env;
const POLL_INTERVAL_MINUTES = Number(process.env.POLL_INTERVAL_MINUTES ?? 2);

if (!DISCORD_TOKEN) {
  console.error("Missing DISCORD_TOKEN in your .env file.");
  process.exit(1);
}

const commands = new Map([
  [hatchrate.data.name, hatchrate],
  [titanics.data.name, titanics],
]);

const tracker = new TitanicTracker();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);

  await tracker.init();
  console.log(`Tracking ${tracker.titanicNames.size} Titanic pets.`);

  // Poll immediately, then on the configured interval.
  await pollOnce();
  setInterval(pollOnce, POLL_INTERVAL_MINUTES * 60_000);

  if (ANNOUNCE_CHANNEL_ID) {
    scheduleHourlyAnnounce();
  }
});

async function pollOnce() {
  try {
    await tracker.poll();
  } catch (err) {
    console.error("Poll failed:", err.message);
  }
}

function scheduleHourlyAnnounce() {
  const msUntilNextHour = 3_600_000 - (Date.now() % 3_600_000);
  setTimeout(() => {
 async function announceHatchRate() {
  try {
    const channel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID);
    const rate = tracker.getRate(60);
    if (!channel || !rate) return;

    const topPets = Object.entries(rate.perPetRate)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const maxRate = topPets.length > 0 ? topPets[0][1] : 1;
    const barFor = (value) => {
      const filled = Math.max(1, Math.round((value / maxRate) * 10));
      return "█".repeat(filled) + "░".repeat(10 - filled);
    };

    const embed = new EmbedBuilder()
      .setTitle("⏰ Hourly Titanic Hatch Rate — Pet Simulator 99")
      .setColor(0xf1c40f)
      .setDescription(`**~${rate.perHour.toFixed(1)} Titanics/hour** globally (last ${rate.windowMinutesActual.toFixed(0)} min)`)
      .addFields(
        topPets.length > 0
          ? topPets.map(([name, perHour]) => ({
              name,
              value: `${barFor(perHour)}  ~${perHour.toFixed(1)}/hr`,
            }))
          : [{ name: "No hatches detected", value: "Nothing moved this hour." }]
      )
      .setFooter({ text: "Estimated from BIG Games' public API (exists-count deltas)." })
      .setTimestamp(rate.latestTimestamp);

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Hourly announce failed:", err.message);
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, tracker);
  } catch (err) {
    console.error(`Error executing /${interaction.commandName}:`, err);
    const errorReply = { content: "Something went wrong running that command.", ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(errorReply);
    } else {
      await interaction.reply(errorReply);
    }
  }
});

client.login(DISCORD_TOKEN);
