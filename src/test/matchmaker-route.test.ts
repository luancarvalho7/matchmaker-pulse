import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/matchmaker/route";

describe("POST /api/matchmaker", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses a 90-second timeout budget for the live webhook latency", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ matches: [] }]), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    const timeoutMock = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(new AbortController().signal);

    vi.stubGlobal("fetch", fetchMock);

    await POST(
      new Request("http://localhost/api/matchmaker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Teste Copilot",
          phone: "11999998888",
          role: "Comprador industrial",
        }),
      }),
    );

    expect(timeoutMock).toHaveBeenCalledWith(90000);
  });
});