import type { StreamEvent } from "@/types/ai";

export function encodeEvent(event: StreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}

export function createEventParser() {
  let buffer = "";

  return {
    push(chunk: string): StreamEvent[] {
      buffer += chunk;
      const events: StreamEvent[] = [];
      let newlineIndex = buffer.indexOf("\n");

      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        newlineIndex = buffer.indexOf("\n");

        if (line.length === 0) continue;

        try {
          const parsed = JSON.parse(line) as StreamEvent;
          if (parsed && typeof parsed === "object" && "type" in parsed) {
            events.push(parsed);
          }
        } catch {
        }
      }

      return events;
    },
  };
}
