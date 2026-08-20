import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("hatchrate")
  .setDescription("Show the current global Titanic pet hatch rate in Pet Simulator 99")
  .addIntegerOption((opt) =>
    opt
      .setName("window")
      .setDescription("Minutes of history to average over (default 60)")
      .setMinValue(5)
      .setMaxValue(180)
  );

export async function execute(interaction, tracker) {
  await interaction.deferReply();

  const window = interaction.options.getInteger("window") ?? 60;
  const rate = tracker.getRate(window);

  if (!rate) {
    await interaction.editReply(
      "Not enough data yet — I need at least two polls of the API before I can compute a rate. Try again in a few minutes."
    );
    return;
  }

  const topPets = Object.entries(rate.perPetRate)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const embed = new EmbedBuilder()
    .setTitle("Titanic Hatch Rate — Pet Simulator 99")
    .setColor(0xf1c40f)
    .setDescription(
      `**~${rate.perHour.toFixed(1)} Titanics/hour** globally, ` +
        `based on the last ${rate.windowMinutesActual.toFixed(0)} min of data.`
    )
    .addFields(
      topPets.length > 0
        ? {
            name: "Top movers in this window",
            value: topPets
              .map(([name, perHour]) => `**${name}** — ~${perHour.toFixed(1)}/hr`)
              .join("\n"),
          }
        : { name: "Top movers", value: "No Titanic hatches detected in this window." }
    )
    .setFooter({
      text: "Estimated from BIG Games' public API (exists-count deltas), not a live event feed.",
    })
    .setTimestamp(rate.latestTimestamp);

  await interaction.editReply({ embeds: [embed] });
}
