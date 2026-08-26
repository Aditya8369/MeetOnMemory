/**
 * Transforms MeetOnMemory meeting data into valid Notion block structures.
 * Keeps transformation logic fully separate from API/network code (Issue #1602).
 *
 * Notion API limits rich_text content to 2000 characters per element.
 */

const MAX_TEXT_LENGTH = 2000;

function safeText(text, maxLen = MAX_TEXT_LENGTH) {
  if (!text || typeof text !== "string") return "";
  return text.length <= maxLen ? text : text.slice(0, maxLen - 3) + "...";
}

function richText(content, annotations = {}) {
  const text = safeText(content);
  if (!text) return [];
  return [
    {
      type: "text",
      text: { content: text },
      ...(Object.keys(annotations).length ? { annotations } : {}),
    },
  ];
}

function heading2(content) {
  const rt = richText(content);
  if (!rt.length) return null;
  return { object: "block", type: "heading_2", heading_2: { rich_text: rt } };
}

function paragraph(content) {
  const rt = richText(content);
  if (!rt.length) return null;
  return { object: "block", type: "paragraph", paragraph: { rich_text: rt } };
}

function callout(content, emoji = "📋") {
  const rt = richText(content);
  if (!rt.length) return null;
  return {
    object: "block",
    type: "callout",
    callout: { rich_text: rt, icon: { type: "emoji", emoji } },
  };
}

function toDo(content, checked = false) {
  const rt = richText(content);
  if (!rt.length) return null;
  return { object: "block", type: "to_do", to_do: { rich_text: rt, checked } };
}

function divider() {
  return { object: "block", type: "divider", divider: {} };
}

/**
 * Split long text into multiple paragraph blocks to stay within Notion limits.
 */
function splitIntoParagraphs(text) {
  if (!text) return [];
  const sections = text.split(/\n{2,}/).filter((s) => s.trim());
  return sections.map((s) => paragraph(s.trim())).filter(Boolean);
}

/**
 * Build metadata callout from meeting fields.
 */
function buildMetadataBlock(meeting) {
  const parts = [];
  if (meeting.date) {
    parts.push(`Date: ${new Date(meeting.date).toLocaleDateString()}`);
  }
  if (meeting.meetingType) parts.push(`Type: ${meeting.meetingType}`);
  if (meeting.duration) parts.push(`Duration: ${meeting.duration} min`);
  if (meeting.location) parts.push(`Location: ${meeting.location}`);
  if (meeting.participants?.length) {
    const names = meeting.participants
      .map((p) => p.name || p.email)
      .filter(Boolean)
      .slice(0, 20)
      .join(", ");
    if (names) parts.push(`Participants: ${names}`);
  }
  if (!parts.length) return null;
  return callout(parts.join(" | "), "📅");
}

/**
 * Build action item to-do blocks from both structuredMoM and DB action items.
 */
function buildActionItemBlocks(meeting, actionItems = []) {
  const blocks = [];
  const seen = new Set();

  const addItem = (text, owner, dueDate, checked) => {
    const key = text.toLowerCase().trim();
    if (seen.has(key)) return;
    seen.add(key);

    let label = text;
    if (owner && owner !== "Unassigned") label += ` (${owner})`;
    if (dueDate) {
      const d =
        dueDate instanceof Date ? dueDate.toLocaleDateString() : dueDate;
      label += ` [Due: ${d}]`;
    }
    const block = toDo(label, checked);
    if (block) blocks.push(block);
  };

  if (meeting.structuredMoM?.actionItems) {
    for (const item of meeting.structuredMoM.actionItems) {
      addItem(
        item.task || item.text || "Action item",
        item.assignee || item.owner,
        item.dueDate,
        false,
      );
    }
  }

  for (const item of actionItems) {
    const checked = ["completed", "resolved"].includes(item.status);
    addItem(item.text, item.owner, item.dueDate, checked);
  }

  return blocks;
}

/**
 * Main transformer: converts a meeting (+ optional DB action items) into
 * Notion page properties and child blocks.
 *
 * @param {Object} meeting - Meeting document
 * @param {Array}  actionItems - ActionItem documents for this meeting
 * @returns {{ properties: Object, children: Array }}
 */
export function transformMeetingToNotionBlocks(meeting, actionItems = []) {
  const properties = {
    title: {
      title: richText(meeting.title || "Untitled Meeting"),
    },
  };

  const children = [];

  // Metadata callout
  const meta = buildMetadataBlock(meeting);
  if (meta) children.push(meta);

  // Recording link
  if (meeting.fileUrl) {
    children.push(paragraph(`Recording: ${meeting.fileUrl}`));
  }

  // Summary
  if (meeting.summary) {
    children.push(heading2("Summary"));
    children.push(...splitIntoParagraphs(meeting.summary));
  }

  // AI Notes
  if (meeting.aiNotes) {
    children.push(heading2("AI Notes"));
    children.push(...splitIntoParagraphs(meeting.aiNotes));
  }

  // Decisions from structuredMoM
  if (meeting.structuredMoM?.decisions?.length) {
    children.push(heading2("Decisions"));
    for (const d of meeting.structuredMoM.decisions) {
      const text =
        typeof d === "string" ? d : d.text || d.decision || JSON.stringify(d);
      const block = paragraph(`• ${text}`);
      if (block) children.push(block);
    }
  }

  // Action Items
  const actionBlocks = buildActionItemBlocks(meeting, actionItems);
  if (actionBlocks.length) {
    children.push(divider());
    children.push(heading2("Action Items"));
    children.push(...actionBlocks);
  }

  // Notion requires at least one child block
  if (children.length === 0) {
    children.push(paragraph("No content available."));
  }

  return { properties, children };
}
