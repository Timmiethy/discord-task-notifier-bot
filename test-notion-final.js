import dotenv from "dotenv";
import fetch from "node-fetch";
dotenv.config();

const databaseId = process.env.NOTION_DATABASE_ID;
const notionToken = process.env.NOTION_TOKEN;

(async () => {
  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page_size: 5 }), // limit for quick test
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status} – ${text}`);
    }

    const data = await response.json();
    console.log("✅ Connected to Notion via REST API!");
    console.log("Total pages fetched:", data.results.length);
    console.log("First task name:", data.results[0]?.properties?.Name?.title?.[0]?.plain_text);
  } catch (err) {
    console.error("❌ Notion test failed:", err.message);
  }
})();