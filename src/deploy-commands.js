import "dotenv/config";
import { REST, Routes } from "discord.js";
import * as hatchrate from "./commands/hatchrate.js";
import * as titanics from "./commands/titanics.js";

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error("Missing DISCORD_TOKEN or CLIENT_ID in your .env file.");
  process.exit(1);
}

const commands = [hatchrate.data.toJSON(), titanics.data.toJSON()];
const rest = new REST().setToken(DISCORD_TOKEN);

try {
  const route = GUILD_ID
    ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
    : Routes.applicationCommands(CLIENT_ID);

  await rest.put(route, { body: commands });

  console.log(
    GUILD_ID
      ? `Registered ${commands.length} command(s) to guild ${GUILD_ID}.`
      : `Registered ${commands.length} command(s) globally (may take up to an hour to appear).`
  );
} catch (err) {
  console.error("Failed to register commands:", err);
  process.exit(1);
}
