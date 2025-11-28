import { getTasks } from "./database.js";
import cron from "node-cron";

// Map Notion assignee names to Discord user IDs
const userMap = {
  "TÂN LÊ THANH": "876405610365718548", // your Discord user ID
  "vophucphuonganh2003@gmail.com": "1025047537155055666",
  "Thanh Huy Nguyễn": "859077013359951893",
  "Ellie": "1249737780796588156",
  "Minh Châu": "693996207063957505",
  "Nguyên Doãn Bá Khánh": "581272006901628931",
  "Nguyen Duc Bao Khôi": "876486447975256114",
  "Lê Đức Kiên": "1371124864123146251",
  "Nguyễn Hoàng Bảo Ngọc": "955822965562425415",
  "Mai Nguyen": "866604684147949578",
  "Dương Kiến Khải": "681697390788608001"
};

function formatDate(dateStr) {
  if (!dateStr) return "No date";
  const date = new Date(dateStr);
  const options = { month: "short", day: "numeric", year: "numeric", weekday: "short" };
  return date.toLocaleDateString("en-US", options);
}

// 🧩 Filter tasks due today or within the next 7 days
function filterUpcoming(tasks) {
  const now = new Date();
  now.setHours(0,0,0,0);
  const limit = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return tasks.filter((t) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    due.setHours(0,0,0,0);
    return due >= now && due <= limit;
  });
}

// 🧩 Inform each department in its own channel
export async function informEachDepartment(client, message) {
  const tasks = await getTasks();
  const upcoming = filterUpcoming(tasks);
  console.log("🧩 Raw assignees from Notion:");
  tasks.forEach((t) => console.log(`- ${t.assignee}`));
  const grouped = upcoming.reduce((acc, t) => {
    acc[t.department] = acc[t.department] || [];
    acc[t.department].push(t);
    return acc;
  }, {});

  const today = new Date();
  today.setHours(0,0,0,0);

  for (const [department, list] of Object.entries(grouped)) {
    const channel = client.channels.cache.find(
      (c) =>
        c.name === `${department.toLowerCase()}-tasks` ||
        c.name === `🎯。${department.toLowerCase()}-tasks`
    );
    console.log(`🔍 Looking for channel: ${department.toLowerCase()}-tasks`);
    console.log(`🧩 Found?`, !!channel);
    if (!channel) continue;

    // Filter tasks due today in this department
    const dueTodayTasks = list.filter(t => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      due.setHours(0,0,0,0);
      return due.getTime() === today.getTime();
    });

    let msg = "";

    if (dueTodayTasks.length > 0) {
      msg += "🔥 **Due Today**\n";
      for (const t of dueTodayTasks) {
        const normalized = t.assignee?.trim().toLowerCase();
        const foundUser = Object.entries(userMap).find(
          ([key]) => key.trim().toLowerCase() === normalized
        );
        const discordMention = foundUser ? `<@${foundUser[1]}>` : `🙍‍♂️ ${t.assignee}`;
        msg += `• 🗂️ **${t.name}**\n   ┣ 🏷️ ${t.department}\n   ┣ 📅 ${formatDate(t.dueDate)}\n   ┣ ⚙️ ${t.status}\n   ┗ 👤 ${discordMention}\n`;
      }
      msg += "\n";
    }

    msg += `📢 **${department} Department – Tasks due within 7 days**\n`;
    for (const t of list) {
      const normalized = t.assignee?.trim().toLowerCase();
      const foundUser = Object.entries(userMap).find(
        ([key]) => key.trim().toLowerCase() === normalized
      );
      if (!foundUser) {
        console.warn(`⚠️ No Discord ID found for: "${t.assignee}"`);
      }
      const discordMention = foundUser ? `<@${foundUser[1]}>` : `🙍‍♂️ ${t.assignee}`;
      msg += `• 🗂️ **${t.name}**\n   ┣ 🏷️ ${t.department}\n   ┣ 📅 ${formatDate(t.dueDate)}\n   ┣ ⚙️ ${t.status}\n   ┗ 👤 ${discordMention}\n`;
    }

    const sent = await channel.send(msg);
    try {
      const thread = await sent.startThread({
        name: `${department} Weekly Tasks`,
        autoArchiveDuration: 10080, // 7 days
      });
      console.log(`✅ Thread created for ${department}`);
      // Wait for thread to initialize
      await new Promise((res) => setTimeout(res, 3000));
      const guild = channel.guild;
      await guild.members.fetch();
      const membersToAdd = guild.members.cache.filter((m) =>
        channel.permissionsFor(m).has("ViewChannel")
      );
      console.log(`👥 Adding ${membersToAdd.size} members to ${thread.name}`);
      for (const [id, member] of membersToAdd) {
        try {
          await thread.members.add(id);
          console.log(`👥 Added ${member.user.tag} to ${thread.name}`);
        } catch (err) {
          console.warn(`⚠️ Could not add ${member.user.tag}: ${err.message}`);
        }
      }
    } catch (err) {
      console.error(`❌ Failed to create thread for ${department}:`, err.message);
    }
  }

  await message.reply("✅ Informed all departments in their channels.");
}

// 🧩 Report grouped by assignee, sent in current channel
export async function reportByAssignee(client, message) {
  const tasks = await getTasks();
  const upcoming = filterUpcoming(tasks);

  if (upcoming.length === 0)
    return message.reply("✅ No tasks due within the next 7 days.");
  console.log("🧩 Raw assignees from Notion:");
  tasks.forEach((t) => console.log(`- ${t.assignee}`));

  // Separate tasks due today
  const today = new Date();
  today.setHours(0,0,0,0);
  const dueTodayTasks = upcoming.filter(t => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    due.setHours(0,0,0,0);
    return due.getTime() === today.getTime();
  });

  let report = "";

  if (dueTodayTasks.length > 0) {
    report += "🔥 **Due Today**\n";
    for (const t of dueTodayTasks) {
      const normalized = t.assignee?.trim().toLowerCase();
      const foundUser = Object.entries(userMap).find(
        ([key]) => key.trim().toLowerCase() === normalized
      );
      const discordMention = foundUser ? `<@${foundUser[1]}>` : `🙍‍♂️ ${t.assignee}`;
      report += `• 🗂️ **${t.name}**\n   ┣ 🏷️ ${t.department}\n   ┣ 📅 ${formatDate(t.dueDate)}\n   ┗ ⚙️ ${t.status} | 👤 ${discordMention}\n`;
    }
    report += "\n";
  }

  const grouped = upcoming.reduce((acc, t) => {
    acc[t.assignee] = acc[t.assignee] || [];
    acc[t.assignee].push(t);
    return acc;
  }, {});

  report += "📋 **Weekly Task Report (Next 7 Days)**\n----------------------------------\n";
  for (const [assignee, list] of Object.entries(grouped)) {
    const normalized = assignee?.trim().toLowerCase();
    const foundUser = Object.entries(userMap).find(
      ([key]) => key.trim().toLowerCase() === normalized
    );
    if (!foundUser) {
      console.warn(`⚠️ No Discord ID found for: "${assignee}"`);
    }
    const discordMention = foundUser ? `<@${foundUser[1]}>` : `🙍‍♂️ ${assignee}`;
    report += `**${discordMention}:**\n`;
    for (const t of list) {
      report += `• 🗂️ **${t.name}**\n   ┣ 🏷️ ${t.department}\n   ┣ 📅 ${formatDate(t.dueDate)}\n   ┗ ⚙️ ${t.status}\n`;
    }
    report += "\n";
  }

  await message.channel.send(report);
}

// 🕐 Optional daily auto-inform
export function scheduleDailyInform(client) {
  cron.schedule(
    "0 9 * * *",
    async () => {
      const fakeMessage = { reply: async () => {} }; // dummy to reuse function
      await informEachDepartment(client, fakeMessage);
      console.log("✅ Auto-inform executed at 9AM.");
    },
    { timezone: "Asia/Ho_Chi_Minh" }
  );
}
