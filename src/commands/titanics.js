import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("titanics")
  .setDescription("List the top Titanic pets and how many exist in-game right now");

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

  const TOP_N = 25;
  const shown = rows.slice(0, TOP_N);
  const remaining = rows.length - shown.length;

  const embed = new EmbedBuilder()
    .setTitle(`Titanic Pets — Top ${shown.length} by Current Count`)
    .setColor(0xf1c40f)
    .setDescription(shown.map(([name, count]) => `**${name}** — ${count.toLocaleString()} exist`).join("\n"))
    .setFooter({
      text:
        remaining > 0
          ? `Totals from BIG Games' public API. +${remaining} more tracked Titanic pets not shown.`
          : "Totals from BIG Games' public API (/api/exists).",
    })
    .setTimestamp(latest.timestamp);

  await interaction.editReply({ embeds: [embed] });
}
