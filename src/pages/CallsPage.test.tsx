// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import callFixture from "../../samples/expected/calls-demo.json";
import { CallsPage } from "./CallsPage";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function renderPage(): void {
  render(
    <MemoryRouter>
      <CallsPage />
    </MemoryRouter>,
  );
}

describe("CallsPage", () => {
  it("loads the synthetic day and exposes the fixed daily oracle", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Zvanu kvalitāte");
    const metrics = screen.getByLabelText("Dienas rādītāji");
    expect(within(metrics).getByText("5")).toBeInTheDocument();
    expect(within(metrics).getByText("18:20")).toBeInTheDocument();
    expect(within(metrics).getByText("82,5")).toBeInTheDocument();
    expect(within(metrics).getByText("4:30")).toBeInTheDocument();
  });

  it("drills into deterministic rubric evidence and review warnings", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /Kontakts 002/ }));
    expect(screen.getByRole("heading", { name: /Kontakts 002/ })).toBeInTheDocument();
    expect(screen.getByText("60 / 100")).toBeInTheDocument();
    const rubric = screen.getByRole("table", { name: "Vērtēšanas kritēriji" });
    expect(within(rubric).getByText("Cena un nosacījumi")).toBeInTheDocument();
    expect(within(rubric).getAllByText("Nav izpildīts").length).toBeGreaterThanOrEqual(4);

    await user.click(screen.getByRole("button", { name: /Kontakts 005/ }));
    expect(screen.getByText("100 / 100")).toBeInTheDocument();
    expect(screen.getByText(/Zema uzticamība/)).toBeInTheDocument();
  });

  it("separates employee and manager summaries and offers handoff actions", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderPage();

    await user.selectOptions(screen.getByLabelText("Atskaites saņēmējs"), "Darbinieks A");
    const summary = screen.getByLabelText("Kopsavilkuma teksts");
    expect(within(summary).getByText(/Vidējais kvalitātes vērtējums: 75,0/)).toBeInTheDocument();
    expect(within(summary).queryByText("Darbinieks B")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Kopēt kopsavilkumu" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Nosūtīt dokumentu sarakstu"));
    expect(screen.getByRole("link", { name: "Atvērt e-pastā" })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:"),
    );
    expect(screen.getByRole("button", { name: "Lejupielādēt JSON" })).toBeInTheDocument();
  });

  it("sends only transcript data to the base-aware analysis endpoint", async () => {
    const user = userEvent.setup();
    const extraction = callFixture.calls[0]?.extraction;
    if (!extraction) throw new Error("Synthetic extraction is missing");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => extraction,
    });
    vi.stubEnv("BASE_URL", "/forest/");
    vi.stubGlobal("fetch", fetchMock);
    renderPage();

    fireEvent.change(screen.getByLabelText("Zvana transkripts"), {
      target: { value: callFixture.calls[0]?.transcript },
    });
    await user.click(screen.getByRole("button", { name: "Analizēt transkriptu" }));

    expect(await screen.findByRole("heading", { name: "Kontakts 006" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/forest/api/analyze-call",
      expect.objectContaining({ method: "POST" }),
    );
    const request = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as Record<
      string,
      unknown
    >;
    expect(request).toEqual(
      expect.objectContaining({
        transcript: callFixture.calls[0]?.transcript,
        metadata: expect.objectContaining({ contactLabel: "Kontakts 006" }),
      }),
    );
    expect(request).not.toHaveProperty("audio");
  });
});
