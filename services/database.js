import dotenv from "dotenv";
import fetch from "node-fetch";
dotenv.config();

function formatStatus(rawStatus) {
  if (!rawStatus) return "⚪ (No Status)";
  const s = rawStatus.toLowerCase();
  if (s.includes("done") || s.includes("completed")) return "✅ Done";
  if (s.includes("in progress") || s.includes("working")) return "🟡 In Progress";
  if (s.includes("not started") || s.includes("todo")) return "🔴 Not Started";
  return `⚙️ ${rawStatus}`;
}

/**
 * Fetch all tasks from your Notion database.
 * Columns supported:
 * - Task (Title)
 * - Assignee (People)
 * - Department (Select)
 * - Status (Select)
 * - Due Date (Date)
 * - Phase (Select)
 */
export async function getTasks() {
  try {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sorts: [
            {
              property: "Due Date", // Matches your database column name
              direction: "ascending",
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status} – ${text}`);
    }

    const data = await response.json();

    // 🧠 Map over your Notion pages
    const tasks = data.results.map((page) => {
      const props = page.properties;
      return {
        id: page.id,
        name:
          props.Task?.title?.[0]?.plain_text ||
          props.Name?.title?.[0]?.plain_text ||
          "(Untitled Task)",
        assignee:
          props.Assignee?.people?.[0]?.name ||
          props.Assignee?.rich_text?.[0]?.plain_text ||
          "(none)",
        department:
          (props.Department?.select?.name ||
           props.Department?.multi_select?.[0]?.name ||
           props.Dept?.select?.name ||
           "Unassigned"),
        status: formatStatus(
          props.Status?.status?.name ||
          props.Status?.select?.name ||
          "Unknown"
        ),
        dueDate: props["Due Date"]?.date?.start || null,
        phase: props.Phase?.select?.name || "N/A",
      };
    });

    console.log(`✅ Tasks fetched: ${tasks.length}`);
    return tasks;
  } catch (err) {
    console.error("❌ Error fetching from Notion:", err.message);
    return [];
  }
}