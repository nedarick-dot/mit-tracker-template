// Shared utilities for Slack edge functions

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const DEPARTMENTS = ["Operations", "Workshops", "Client Success", "Sales", "Marketing", "Events", "RevOps", "Growth"];

// ── Week / date helpers ────────────────────────────────────────
function getQuarterAnchor(): Date {
  const qs = new Date("2026-07-01");
  const day = qs.getDay();
  const offset = day === 0 ? -6 : -(day - 1);
  qs.setDate(qs.getDate() + offset);
  return qs;
}

export function getCurrentWeekNumber(): number {
  const anchor = getQuarterAnchor();
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.min(Math.floor(diffDays / 7) + 1, 13));
}

export function getWeekDates(weekNumber: number): { startStr: string; endStr: string } {
  const anchor = getQuarterAnchor();
  const weekStart = new Date(anchor.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  return {
    startStr: weekStart.toISOString().split("T")[0],
    endStr: weekEnd.toISOString().split("T")[0],
  };
}

export function getActiveMonth(weekNumber: number): string {
  return weekNumber <= 4 ? "July" : weekNumber <= 9 ? "August" : "September";
}

export function getTodayIso(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Slack signature verification ──────────────────────────────
export async function verifySlackSignature(
  reqHeaders: Headers,
  body: string,
  signingSecret: string
): Promise<boolean> {
  const timestamp = reqHeaders.get("x-slack-request-timestamp");
  const signature = reqHeaders.get("x-slack-signature");
  if (!timestamp || !signature) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;

  const base = `v0:${timestamp}:${body}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(base));
  const computed = "v0=" + Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computed === signature;
}

// ── Slack API helper ──────────────────────────────────────────
export async function slackApi(endpoint: string, token: string, body: object): Promise<any> {
  const res = await fetch(`https://slack.com/api/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function openDm(slackUserId: string, token: string): Promise<string | null> {
  const res = await slackApi("conversations.open", token, { users: slackUserId });
  return res?.channel?.id || null;
}

// ── MIT check-in modal builder ────────────────────────────────
export type ModalParams = {
  mit: { id: string; title: string; owner?: string | null; mit_statement?: string | null };
  milestone: { id: string; description?: string | null } | null;
  mitIds: string[];
  currentIndex: number;
  weekNumber: number;
  department: string;
  authorName: string;
  slackUserId: string;
  activeMonth: string;
};

export function buildMitModal(p: ModalParams): object {
  const total = p.mitIds.length;
  const isLast = p.currentIndex === total - 1;

  const privateMetadata = JSON.stringify({
    mit_ids: p.mitIds,
    current_index: p.currentIndex,
    week_number: p.weekNumber,
    department: p.department,
    author_name: p.authorName,
    slack_user_id: p.slackUserId,
  });

  const titleText = total > 1
    ? `MIT ${p.currentIndex + 1} of ${total}`
    : "MIT Check-in";

  const blocks: object[] = [
    {
      type: "header",
      text: { type: "plain_text", text: p.mit.title, emoji: true },
    },
  ];

  if (p.mit.mit_statement) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: p.mit.mit_statement },
    });
  }

  if (p.mit.owner) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `Owner: ${p.mit.owner} · Week ${p.weekNumber}` }],
    });
  }

  if (p.milestone?.description) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:calendar: *${p.activeMonth} milestone:* ${p.milestone.description}`,
      },
    });
  }

  blocks.push({ type: "divider" });

  const idx = p.currentIndex;

  // Q1 — What moved forward (required)
  blocks.push({
    type: "input",
    block_id: `update_text_${idx}`,
    element: {
      type: "plain_text_input",
      action_id: "update_text_input",
      multiline: true,
      placeholder: { type: "plain_text", text: "What actions were taken? What progress was made? Be specific — 2-4 sentences." },
    },
    label: { type: "plain_text", text: "What moved forward this week? *" },
  });

  // Q2 — What was completed (optional)
  blocks.push({
    type: "input",
    block_id: `what_completed_${idx}`,
    optional: true,
    element: {
      type: "plain_text_input",
      action_id: "what_completed_input",
      multiline: true,
      placeholder: { type: "plain_text", text: "Specific deliverables, outputs, or milestones crossed off" },
    },
    label: { type: "plain_text", text: "What did you complete or deliver? (optional)" },
  });

  // Q3 — Focus next week (optional, stored in key_decisions for rollup look_ahead)
  blocks.push({
    type: "input",
    block_id: `key_decisions_${idx}`,
    optional: true,
    element: {
      type: "plain_text_input",
      action_id: "key_decisions_input",
      multiline: true,
      placeholder: { type: "plain_text", text: "Top 2-3 priorities for next week. Any decisions made this week leadership should know about." },
    },
    label: { type: "plain_text", text: "Focus next week + key decisions (optional)" },
  });

  // Q4 — Blockers (optional)
  blocks.push({
    type: "input",
    block_id: `blocker_text_${idx}`,
    optional: true,
    element: {
      type: "plain_text_input",
      action_id: "blocker_text_input",
      multiline: true,
      placeholder: { type: "plain_text", text: "What's stopping progress? What does Ned need to unblock?" },
    },
    label: { type: "plain_text", text: "Blockers or escalations needed? (optional)" },
  });

  // Q5 — Confidence (always shown)
  blocks.push({
    type: "input",
    block_id: `confidence_${idx}`,
    element: {
      type: "radio_buttons",
      action_id: "confidence_input",
      options: [
        {
          text: { type: "plain_text", text: "On Track — executing as planned", emoji: true },
          value: "confident",
        },
        {
          text: { type: "plain_text", text: "At Risk — concerned, working on it", emoji: true },
          value: "shaky",
        },
        {
          text: { type: "plain_text", text: "Blocked — need help to move forward", emoji: true },
          value: "off_track",
        },
      ],
    },
    label: {
      type: "plain_text",
      text: p.milestone
        ? `${p.activeMonth} milestone confidence *`
        : "Overall status on this MIT *",
    },
  });

  // Q6 — Carry forward (optional checkbox)
  blocks.push({
    type: "input",
    block_id: `carry_forward_${idx}`,
    optional: true,
    element: {
      type: "checkboxes",
      action_id: "carry_forward_input",
      options: [
        {
          text: { type: "plain_text", text: "Yes — carry unfinished items into next week", emoji: true },
          value: "yes",
        },
      ],
    },
    label: { type: "plain_text", text: "Carry forward?" },
  });

  return {
    type: "modal",
    callback_id: "mit_checkin",
    title: { type: "plain_text", text: titleText },
    submit: { type: "plain_text", text: isLast ? "Submit & Finish" : "Next MIT →" },
    close: { type: "plain_text", text: "Save for Later" },
    private_metadata: privateMetadata,
    blocks,
  };
}
