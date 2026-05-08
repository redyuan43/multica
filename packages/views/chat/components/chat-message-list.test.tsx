import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@multica/core/i18n/react";
import type { ChatMessage, ChatPendingTask } from "@multica/core/types";
import enChat from "../../locales/en/chat.json";
import { ChatMessageList } from "./chat-message-list";

const mockApi = vi.hoisted(() => ({
  listTaskMessages: vi.fn(),
}));

vi.mock("@multica/core/api", () => ({
  api: mockApi,
}));

const TEST_RESOURCES = { en: { chat: enChat } };

function renderList(messages: ChatMessage[], pendingTask: ChatPendingTask | null) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <I18nProvider locale="en" resources={TEST_RESOURCES}>
      <QueryClientProvider client={queryClient}>
        <ChatMessageList
          messages={messages}
          pendingTask={pendingTask}
          availability={undefined}
        />
      </QueryClientProvider>
    </I18nProvider>,
  );
}

describe("ChatMessageList", () => {
  beforeEach(() => {
    mockApi.listTaskMessages.mockReset();
    Element.prototype.scrollTo = vi.fn();
  });

  it("does not fetch task messages for optimistic pending task ids", async () => {
    renderList([], {
      task_id: "optimistic-optimistic-1778233362442",
      status: "queued",
      created_at: "2026-05-08T09:42:42.442Z",
    });

    await waitFor(() => {
      expect(mockApi.listTaskMessages).not.toHaveBeenCalled();
    });
  });

  it("does not fetch assistant task messages for optimistic task ids", async () => {
    renderList([
      {
        id: "message-1",
        chat_session_id: "session-1",
        role: "assistant",
        content: "Working on it",
        task_id: "optimistic-optimistic-1778233362442",
        created_at: "2026-05-08T09:42:42.442Z",
      },
    ], null);

    await waitFor(() => {
      expect(mockApi.listTaskMessages).not.toHaveBeenCalled();
    });
  });
});
