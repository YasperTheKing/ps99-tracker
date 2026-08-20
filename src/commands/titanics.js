import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("titanics")
  .setDescription("List all current Titanic pets and how many exist in-game right now");

export async function execute(interaction, tracker) {
  await interaction.deferReply();

  if (tracker.history.length === 0) {
    await interaction.editReply("No data yet — try again in a minute.");
    return;
  }

  const latest = tracker.history[tracker.history.length - 1];
  const rows = Object.entries(latest.perPet).sort((a, b) => b[1] - a[1]);

  if (rows.length === 0) {
    await interaction.editReply("No Titanic pets found in the current game data.");
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("Titanic Pets — Current Totals")
    .setColor(0xf1c40f)
    .setDescription(rows.map(([name, count]) => `**${name}** — ${count.toLocaleString()} exist`).join("\n"))
    .setFooter({ text: "Totals from BIG Games' public API (/api/exists)." })
    .setTimestamp(latest.timestamp);

  await interaction.editReply({ embeds: [embed] });
}
