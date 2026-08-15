import { Client } from "@notionhq/client";

// Notion OAuth endpoints
const NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token";

export const exchangeOAuthToken = async (code, redirectUri) => {
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Notion integration is not configured on the server.");
  }

  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(NOTION_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${encoded}`,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Notion OAuth error:", data);
    throw new Error(
      data.error_description || "Failed to exchange Notion token",
    );
  }

  return data;
};

export const fetchDatabases = async (accessToken) => {
  const notion = new Client({ auth: accessToken });

  // Fetch databases the integration has been shared with
  const response = await notion.search({
    filter: {
      value: "database",
      property: "object",
    },
    sort: {
      direction: "descending",
      timestamp: "last_edited_time",
    },
  });

  return response.results.map((db) => ({
    id: db.id,
    title: db.title?.[0]?.plain_text || "Untitled Database",
    url: db.url,
  }));
};

export const createMeetingPage = async (meeting, integration) => {
  if (!integration.targetDatabaseId) {
    throw new Error("Target Notion database is not configured.");
  }

  const notion = new Client({ auth: integration.accessToken });

  const children = [];

  // Add Transcript Link if available
  if (meeting.fileUrl || meeting.transcript) {
    children.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: {
              content: "Transcript: ",
            },
            annotations: {
              bold: true,
            },
          },
          {
            type: "text",
            text: {
              content: meeting.fileUrl
                ? "Recording Link"
                : "Available in MeetOnMemory",
            },
          },
        ],
      },
    });
  }

  // Add Summary
  if (meeting.summary) {
    children.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "Summary" } }],
      },
    });

    // Split summary by paragraphs (very basic splitting)
    const paragraphs = meeting.summary.split("\n\n").filter((p) => p.trim());
    for (const p of paragraphs) {
      children.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            { type: "text", text: { content: p.substring(0, 2000) } },
          ], // Notion text limits
        },
      });
    }
  }

  // Add Action Items
  if (
    meeting.structuredMoM &&
    meeting.structuredMoM.actionItems &&
    meeting.structuredMoM.actionItems.length > 0
  ) {
    children.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "Action Items" } }],
      },
    });

    for (const item of meeting.structuredMoM.actionItems) {
      let text = item.task || "Action item";
      if (item.assignee) text += ` (Assignee: ${item.assignee})`;
      if (item.dueDate) text += ` [Due: ${item.dueDate}]`;

      children.push({
        object: "block",
        type: "to_do",
        to_do: {
          rich_text: [
            { type: "text", text: { content: text.substring(0, 2000) } },
          ],
          checked: false,
        },
      });
    }
  }

  const response = await notion.pages.create({
    parent: { database_id: integration.targetDatabaseId },
    properties: {
      // Notion Database title property is usually "Name" or "title" type.
      // We will assume "Name" or title field. In a real integration, we might need to introspect the DB properties.
      // Passing "title" property directly (it maps to whatever the title property of the DB is).
      title: {
        title: [
          {
            type: "text",
            text: {
              content: meeting.title || "Untitled Meeting",
            },
          },
        ],
      },
    },
    children: children,
  });

  return response;
};
