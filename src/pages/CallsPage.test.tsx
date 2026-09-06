// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import callFixture from "../../samples/expected/calls-demo.json";
import { CallsPage } from "./CallsPage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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

function mp3File(): File {
  vi.stubGlobal(
    "URL",
    Object.assign(class extends URL {}, {
      createObjectURL: vi.fn().mockReturnValue("blob:call-audio"),
      revokeObjectURL: vi.fn(),
    }),
  );
  return new File(["ID3synthetic-audio"], "saruna.mp3", { type: "audio/mpeg" });
}

describe("CallsPage", () => {
  it("offers the realistic call as both MP3 and TXT downloads", () => {
    vi.stubEnv("BASE_URL", "/forest/");
    renderPage();
    expect(screen.getByRole("link", { name: "Lejupielādēt parauga MP3" })).toHaveAttribute(
      "href",
      "/forest/samples/calls/sintetisks-zvans-ar-partraukumu.mp3",
    );
    expect(screen.getByRole("link", { name: "Lejupielādēt parauga TXT" })).toHaveAttribute(
      "href",
      "/forest/samples/calls/sintetisks-zvans-ar-partraukumu.txt",
    );
  });

  it.each(["picker", "drop"])(
    "transcribes MP3 from the %s, then analyzes only reviewed text",
    async (method) => {
      const user = userEvent.setup();
      const recognized = "Darbinieks: Labdien!\nKlients: Četri hektāri.";
      const reviewed = "Darbinieks: Labdien!\nKlients: Četri komats septiņi hektāri.";
      const file = mp3File();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({
            transcript: recognized,
            durationSec: 255,
            warnings: ["Platība jāpārbauda."],
          }),
        )
        .mockResolvedValueOnce(Response.json(callFixture.calls[0]?.extraction));
      vi.stubGlobal("fetch", fetchMock);
      vi.stubEnv("BASE_URL", "/forest/");
      renderPage();
      if (method === "picker") {
        await user.upload(screen.getByLabelText("Izvēlēties TXT vai MP3 failu"), file);
      } else {
        fireEvent.drop(screen.getByRole("region", { name: "Transkripta faila augšupielāde" }), {
          dataTransfer: { files: [file], types: ["Files"] },
        });
      }
      expect(fetchMock).not.toHaveBeenCalled();
      expect(
        screen.queryByRole("button", { name: "Analizēt transkriptu" }),
      ).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Atšifrēt MP3" }));
      await waitFor(() =>
        expect(screen.getByLabelText("Zvana transkripts")).toHaveValue(recognized),
      );
      expect(screen.getByLabelText("Ilgums sekundēs")).toHaveValue(255);
      expect(screen.getByText("Platība jāpārbauda.")).toBeInTheDocument();
      expect(within(screen.getByLabelText("Dienas rādītāji")).getByText("5")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Lejupielādēt transkriptu TXT" })).toBeEnabled();
      expect(fetchMock.mock.calls[0]?.[0]).toBe("/forest/api/transcribe-call");
      expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual({
        audio: btoa("ID3synthetic-audio"),
      });
      fireEvent.change(screen.getByLabelText("Zvana transkripts"), { target: { value: reviewed } });
      await user.click(screen.getByRole("button", { name: "Analizēt transkriptu" }));
      expect(await screen.findByRole("heading", { name: "Kontakts 006" })).toBeInTheDocument();
      expect(fetchMock.mock.calls[1]?.[0]).toBe("/forest/api/analyze-call");
      const analysisBody = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);
      expect(analysisBody.transcript).toBe(reviewed);
      expect(analysisBody).not.toHaveProperty("audio");
    },
  );

  it("keeps old text and selected MP3 after failure, then allows switching back to TXT", async () => {
    const user = userEvent.setup();
    const file = mp3File();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ message: "Audio nav pieejams." }, { status: 503 })),
    );
    renderPage();
    fireEvent.change(screen.getByLabelText("Zvana transkripts"), {
      target: { value: "Previous transcript" },
    });
    await user.upload(screen.getByLabelText("Izvēlēties TXT vai MP3 failu"), file);
    await user.click(screen.getByRole("button", { name: "Atšifrēt MP3" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Audio nav pieejams.");
    expect(screen.getByLabelText("Zvana transkripts")).toHaveValue("Previous transcript");
    expect(screen.getByText("saruna.mp3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Atšifrēt MP3" })).toBeEnabled();
    const text = new File(["Darbinieks: Sveiki.\nKlients: Jā."], "text.txt", {
      type: "text/plain",
    });
    Object.defineProperty(text, "text", { value: async () => "Darbinieks: Sveiki.\nKlients: Jā." });
    await user.upload(screen.getByLabelText("Izvēlēties TXT vai MP3 failu"), text);
    await waitFor(() =>
      expect(screen.getByLabelText("Zvana transkripts")).toHaveValue(
        "Darbinieks: Sveiki.\nKlients: Jā.",
      ),
    );
    expect(screen.getByRole("button", { name: "Analizēt transkriptu" })).toBeEnabled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:call-audio");
  });

  it("rejects an oversized MP3 before a network call without losing existing text", async () => {
    const file = new File(["x"], "large.mp3", { type: "audio/mpeg" });
    Object.defineProperty(file, "size", { value: 3_200_001 });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderPage();
    fireEvent.change(screen.getByLabelText("Zvana transkripts"), {
      target: { value: "Previous transcript" },
    });
    fireEvent.drop(screen.getByRole("region", { name: "Transkripta faila augšupielāde" }), {
      dataTransfer: { files: [file], types: ["Files"] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("3,2 MB");
    expect(screen.getByLabelText("Zvana transkripts")).toHaveValue("Previous transcript");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads the synthetic day and exposes the fixed daily oracle", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Zvanu kvalitāte");
    const metrics = screen.getByLabelText("Dienas rādītāji");
    expect(within(metrics).getByText("5")).toBeInTheDocument();
    expect(within(metrics).getByText("18:20")).toBeInTheDocument();
    expect(within(metrics).getByText("82,5")).toBeInTheDocument();
    expect(within(metrics).getByText("4:30")).toBeInTheDocument();
    expect(screen.getByText(/ārējam OpenRouter modelim/)).toBeInTheDocument();
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
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(Response.json(extraction));
    vi.stubEnv("BASE_URL", "/forest/");
    vi.stubGlobal("fetch", fetchMock);
    renderPage();

    fireEvent.change(screen.getByLabelText("Zvana transkripts"), {
      target: { value: callFixture.calls[0]?.transcript },
    });
    await user.click(screen.getByRole("button", { name: "Analizēt transkriptu" }));

    expect(await screen.findByRole("heading", { name: "Kontakts 006" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(within(screen.getByLabelText("Dienas rādītāji")).getByText("6")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/forest/api/analyze-call",
      expect.objectContaining({ method: "POST" }),
    );
    const request = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as Record<
      string,
      unknown
    >;
    expect(request).toEqual(
      expect.objectContaining({ transcript: callFixture.calls[0]?.transcript }),
    );
    expect(request.metadata).toEqual(expect.objectContaining({ startedAt: expect.any(String) }));
    const metadata = request.metadata as Record<string, unknown>;
    expect(metadata).not.toHaveProperty("employee");
    expect(metadata).not.toHaveProperty("contactLabel");
    expect(metadata).not.toHaveProperty("durationSec");
    expect(request).not.toHaveProperty("fileName");
    expect(request).not.toHaveProperty("audio");
  });

  it("offers both downloadable transcripts before an analysis is requested", async () => {
    const user = userEvent.setup();
    vi.stubEnv("BASE_URL", "/forest/");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderPage();

    await user.selectOptions(screen.getByLabelText("Zvana paraugs"), "call-a1");
    const download = screen.getByRole("link", { name: "Lejupielādēt parauga TXT" });
    expect(download).toHaveAttribute("href", "/forest/samples/calls/zvans-par-ipasumu.txt");
    expect(download).toHaveAttribute("download", "zvans-par-ipasumu.txt");
    await user.selectOptions(screen.getByLabelText("Zvana paraugs"), "call-a2");
    expect(download).toHaveAttribute("href", "/forest/samples/calls/zvans-ar-trukumiem.txt");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("inserts the selected sample and metadata without analyzing or changing the demo day", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderPage();

    await user.selectOptions(screen.getByLabelText("Zvana paraugs"), "call-a2");
    await user.click(screen.getByRole("button", { name: "Ievietot parauga tekstu" }));

    expect(screen.getByLabelText("Zvana transkripts")).toHaveValue(
      callFixture.calls[1]?.transcript,
    );
    expect(screen.getByLabelText("Darbinieks")).toHaveValue(callFixture.calls[1]?.employee);
    expect(screen.getByLabelText("Ilgums sekundēs")).toHaveValue(callFixture.calls[1]?.durationSec);
    expect(within(screen.getByLabelText("Dienas rādītāji")).getByText("5")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads the downloadable TXT into the form and submits its actual text", async () => {
    const user = userEvent.setup();
    const sample = callFixture.calls[0];
    const fetchMock = vi.fn().mockResolvedValue(Response.json(sample?.extraction));
    vi.stubGlobal("fetch", fetchMock);
    renderPage();

    const file = new File([`${sample?.transcript}\n`], "zvans-par-ipasumu.txt", {
      type: "text/plain",
    });
    Object.defineProperty(file, "text", { value: async () => `${sample?.transcript}\n` });
    await user.upload(screen.getByLabelText("Izvēlēties TXT vai MP3 failu"), file);
    await waitFor(() => {
      expect(screen.getByLabelText("Zvana transkripts")).toHaveValue(`${sample?.transcript}\n`);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Analizēt transkriptu" }));

    expect(await screen.findByRole("heading", { name: "Kontakts 006" })).toBeInTheDocument();
    const request = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as Record<
      string,
      unknown
    >;
    expect(request.transcript).toBe(sample?.transcript);
    expect(request).not.toHaveProperty("audio");
  });

  it("accepts a TXT dropped into the transcript field without navigating", async () => {
    renderPage();
    const transcript = `${callFixture.calls[0]?.transcript}\n`;
    const file = new File([transcript], "zvans.txt", { type: "text/plain" });
    Object.defineProperty(file, "text", { value: async () => transcript });
    const dropZone = screen.getByRole("region", { name: "Transkripta faila augšupielāde" });
    expect(fireEvent.drop(dropZone, { dataTransfer: { files: [file], types: ["Files"] } })).toBe(
      false,
    );
    await waitFor(() => expect(screen.getByLabelText("Zvana transkripts")).toHaveValue(transcript));
    expect(screen.getByText("zvans.txt")).toBeInTheDocument();
  });

  it("rejects a PDF dropped into the TXT area and preserves the existing transcript", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Zvana transkripts"), {
      target: { value: "Existing text" },
    });
    const file = new File(["%PDF-test"], "ligums.pdf", { type: "application/pdf" });
    fireEvent.drop(screen.getByRole("region", { name: "Transkripta faila augšupielāde" }), {
      dataTransfer: { files: [file], types: ["Files"] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("Izvēlieties TXT vai MP3 failu");
    expect(screen.getByLabelText("Zvana transkripts")).toHaveValue("Existing text");
  });

  it.each([
    ["   ", "TXT failā nav sarunas teksta."],
    ["a".repeat(100_001), "Transkripta fails pārsniedz 100 KB ierobežojumu."],
  ])("keeps existing text when the dropped TXT is invalid", async (text, message) => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Zvana transkripts"), {
      target: { value: "Existing text" },
    });
    const file = new File([text], "zvans.txt", { type: "text/plain" });
    Object.defineProperty(file, "text", { value: async () => text });
    fireEvent.drop(screen.getByRole("region", { name: "Transkripta faila augšupielāde" }), {
      dataTransfer: { files: [file], types: ["Files"] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText("Zvana transkripts")).toHaveValue("Existing text");
  });
});
