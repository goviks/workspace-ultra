"use client";

import { useCallback, useEffect, useRef } from "react";

import { createAIError, errorFromStatus, normalizeError } from "@/lib/errors";
import { createEventParser } from "@/lib/stream/ndjson";
import { getSelectedText, useAssistantStore } from "@/lib/store/assistant-store";
import type { AIError, ImproveErrorBody, ImproveRequest, StreamMeta } from "@/types/ai";

const ENDPOINT = "/api/ai";
const REQUEST_TIMEOUT_MS = 45_000;

type AbortReason = "user" | "timeout" | null;

async function readErrorBody(response: Response): Promise<AIError> {
  try {
    const data = (await response.json()) as Partial<ImproveErrorBody>;
    if (data.error?.code) return data.error;
  } catch {
  }
  return errorFromStatus(response.status);
}

export function useAIStream() {
  const controllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortReasonRef = useRef<AbortReason>(null);
  const runIdRef = useRef(0);

  const run = useCallback(async (textOverride?: string) => {
    const state = useAssistantStore.getState();
    const text = (textOverride ?? getSelectedText(state)).trim();

    if (!text) return;

    controllerRef.current?.abort();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const runId = ++runIdRef.current;
    const isCurrent = () => runId === runIdRef.current;

    const controller = new AbortController();
    controllerRef.current = controller;
    abortReasonRef.current = null;

    state.begin(text);
    timeoutRef.current = setTimeout(() => {
      abortReasonRef.current = "timeout";
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    const startedAt = performance.now();
    const payload: ImproveRequest = { text, mode: state.mode };

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!isCurrent()) return;

      if (!response.ok) {
        useAssistantStore.getState().fail(await readErrorBody(response));
        return;
      }

      if (!response.body) {
        useAssistantStore.getState().fail(createAIError("network"));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = createEventParser();

      let receivedChars = 0;
      let meta: StreamMeta | null = null;
      let streamError: AIError | null = null;

      while (isCurrent()) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        for (const event of parser.push(chunk)) {
          if (event.type === "delta") {
            receivedChars += event.text.length;
            useAssistantStore.getState().appendDelta(event.text);
          } else if (event.type === "error") {
            streamError = event.error;
          } else if (event.type === "done") {
            meta = event.meta;
          }
        }

        if (streamError) {
          await reader.cancel().catch(() => undefined);
          break;
        }
      }

      if (!isCurrent()) return;

      if (streamError) {
        useAssistantStore.getState().fail(streamError);
        return;
      }

      if (receivedChars === 0) {
        useAssistantStore.getState().fail(createAIError("empty_response"));
        return;
      }

      useAssistantStore.getState().succeed(
        meta ?? {
          model: "unknown",
          durationMs: Math.round(performance.now() - startedAt),
        },
      );
    } catch (error) {
      if (!isCurrent()) return;

      if (error instanceof Error && error.name === "AbortError") {
        if (abortReasonRef.current === "timeout") {
          useAssistantStore.getState().fail(createAIError("timeout"));
        } else {
          useAssistantStore.getState().markAborted();
        }
        return;
      }

      useAssistantStore.getState().fail(normalizeError(error));
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    }
  }, []);

  const cancel = useCallback(() => {
    abortReasonRef.current = "user";
    controllerRef.current?.abort();
  }, []);

  const retry = useCallback(() => {
    const { source } = useAssistantStore.getState();
    if (!source) return;
    void run(source);
  }, [run]);

  useEffect(
    () => () => {
      runIdRef.current += 1;
      abortReasonRef.current = "user";
      controllerRef.current?.abort();
    },
    [],
  );

  return { run, cancel, retry };
}
