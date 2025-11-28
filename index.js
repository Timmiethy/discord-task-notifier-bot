import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { informEachDepartment, reportByAssignee, scheduleDailyInform } from "./services/notifier.js";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  scheduleDailyInform(client);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  const text = message.content.replace(/<@!?\d+>/, "").trim().toLowerCase();

  if (text.startsWith("inform")) {
    await informEachDepartment(client, message);
  } 
  else if (text.startsWith("report")) {
    await reportByAssignee(client, message);
  } 
  else {
    await message.reply(
      "🤖 Commands available:\n`@bot inform` → send each department’s task summary\n`@bot report` → show tasks by assignee in this channel"
    );
  }
});

client.login(process.env.DISCORD_TOKEN);