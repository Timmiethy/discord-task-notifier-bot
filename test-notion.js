import dotenv from "dotenv";
import { createRequire } from "module";
dotenv.config();

const require = createRequire(import.meta.url);
const notionModule = require("@notionhq/client");

// ✅ correct constructor reference
const notion = new notionModule.Client({ auth: process.env.NOTION_TOKEN });

(async () => {
  try {
    console.log("Client keys:", Object.keys(notionModule));

    const res = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
    });

    console.log("✅ Connected to Notion!");
    console.log("Total pages fetched:", res.results.length);
  } catch (err) {
    console.error("❌ Notion test failed:", err.message);
  }
})();