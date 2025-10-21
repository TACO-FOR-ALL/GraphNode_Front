import { toMarkdownFromUnknown } from "./toMarkdown";
import { ChatMessage, ChatThread } from "../types/Chat";
import uuid from "./uuid";
import threadRepo from "../managers/threadRepo";

const mapRole = (raw: any): "user" | "assistant" | "system" => {
  const r = String(raw ?? "").toLowerCase();
  if (r.includes("assist")) return "assistant";
  if (r.includes("system") || r === "sys") return "system";
  return "user";
};

const toMs = (v: any): number | undefined => {
  const n = Number(v);
  if (!isFinite(n)) return;
  // 13자리 이상이면 이미 ms로 간주
  return n > 1e12 ? Math.round(n) : Math.round(n * 1000);
};

const toMsg = (m: any): ChatMessage | null => {
  const role = mapRole(m.role ?? m.author ?? m.speaker);
  const raw = m.content ?? m.text ?? m.message ?? m.delta ?? "";
  const content = toMarkdownFromUnknown(raw);
  if (!content) return null;

  const ts = Number(m.ts ?? m.time ?? m.create_time ?? Date.now());
  return { id: uuid(), role, content, ts: isFinite(ts) ? ts : Date.now() };
};

export function parseConversations(json: any): ChatThread[] {
  const threads: ChatThread[] = [];
  const isMsg = (x: ChatMessage | null): x is ChatMessage => x != null;

  if (Array.isArray(json?.threads)) {
    for (const th of json.threads) {
      const msgs = (Array.isArray(th?.messages) ? th.messages : [])
        .map(toMsg)
        .filter(isMsg);
      if (!msgs.length) continue;
      threads.push(
        threadRepo.create(
          String(th?.title || threadRepo.inferTitle(msgs)),
          msgs
        )
      );
    }
    return threads;
  }

  if (Array.isArray(json?.messages)) {
    const msgs = json.messages.map(toMsg).filter(isMsg);
    if (msgs.length)
      threads.push(threadRepo.create(threadRepo.inferTitle(msgs), msgs));
    return threads;
  }

  if (Array.isArray(json)) {
    const looksLikeOpenAI = json.some(
      (it) =>
        it &&
        typeof it === "object" &&
        it.mapping &&
        typeof it.mapping === "object"
    );

    if (looksLikeOpenAI) {
      for (const conv of json) {
        const mapping = conv?.mapping || {};
        const nodes: any[] = Object.values(mapping).filter(
          (n: any) => n && n.message
        );

        const msgs = nodes
          .map((n: any) => {
            const msg = n.message;

            const role = mapRole(msg?.author?.role);

            const content = toMarkdownFromUnknown(
              msg?.content ?? msg?.text ?? ""
            );

            const hidden = msg?.metadata?.is_visually_hidden_from_conversation;
            if (hidden || !content.trim()) return null;

            const ts =
              toMs(msg?.create_time) ??
              toMs(n?.create_time) ??
              toMs(conv?.create_time) ??
              Date.now();

            return { id: uuid(), role, content, ts } as ChatMessage;
          })
          .filter((m): m is ChatMessage => !!m)
          .sort((a, b) => a.ts - b.ts);

        if (msgs.length) {
          const title = String(conv?.title || threadRepo.inferTitle(msgs));

          const maxMsgTs = Math.max(...msgs.map((m) => m.ts));
          const updatedAt =
            (isFinite(maxMsgTs) ? maxMsgTs : 0) ||
            toMs(conv?.update_time) ||
            toMs(conv?.create_time) ||
            Date.now();

          const th = threadRepo.create(title, msgs);
          (th as any).updatedAt = updatedAt;
          threads.push(th);
        }
      }
      return threads;
    }

    const maybeMsgs = json.map(toMsg).filter(isMsg);
    if (maybeMsgs.length)
      threads.push(
        threadRepo.create(threadRepo.inferTitle(maybeMsgs), maybeMsgs)
      );
    return threads;
  }

  return threads;
}
