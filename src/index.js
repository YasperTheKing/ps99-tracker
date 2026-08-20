import "dotenv/config";
import { Client, GatewayIntentBits, Events } from "discord.js";
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
    announceHatchRate();
    setInterval(announceHatchRate, 3_600_000);
  }, msUntilNextHour);
}

async function announceHatchRate() {
  try {
    const channel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID);
    const rate = tracker.getRate(60);
    if (!channel || !rate) return;

    const topPets = Object.entries(rate.perPetRate)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, perHour]) => `${name} (~${perHour.toFixed(1)}/hr)`)
      .join(", ");

    await channel.send(
      `**Titanic Hatch Rate:** ~${rate.perHour.toFixed(1)}/hour globally.` +
        (topPets ? ` Top: ${topPets}.` : "")
    );
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
