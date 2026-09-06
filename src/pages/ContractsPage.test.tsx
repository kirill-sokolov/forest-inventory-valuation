// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import purchaseCached from "../../samples/expected/contract-synthetic-pirkuma-ligums.extracted.json";
import { extractContractPdfText } from "../components/contracts/extractContractPdf";

import { ContractsPage } from "./ContractsPage";

vi.mock("../components/contracts/extractContractPdf", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../components/contracts/extractContractPdf")>()),
  extractContractPdfText: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function renderPage(): void {
  render(
    <MemoryRouter>
      <ContractsPage />
    </MemoryRouter>,
  );
}

describe("ContractsPage", () => {
  it("offers only owned samples and renders the cached incomplete result", async () => {
    const user = userEvent.setup();
    renderPage();

    const samplePicker = screen.getByLabelText("Līguma paraugs");
    expect(within(samplePicker).getAllByRole("option")).toHaveLength(3);
    await user.selectOptions(samplePicker, "synthetic-pirkuma-nepilns");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lejupielādēt parauga PDF" })).toHaveAttribute(
      "download",
      "synthetic-pirkuma-nepilns.pdf",
    );
    await user.click(screen.getByRole("button", { name: "Skatīt gatavo rezultātu" }));

    expect(screen.getByText("Sagatavots parauga rezultāts")).toBeInTheDocument();
    expect(screen.getByText("Nav norādīta pirkuma cena.")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Pārbaudāmie jautājumi/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Atvērt e-pastā" })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:"),
    );
  });

  it("offers a downloadable purchase PDF before any result is opened", () => {
    vi.stubEnv("BASE_URL", "/forest/");
    renderPage();

    expect(screen.getByRole("link", { name: "Lejupielādēt parauga PDF" })).toHaveAttribute(
      "href",
      "/forest/samples/contracts/synthetic-pirkuma-ligums.pdf",
    );
    expect(screen.getByLabelText("Līguma paraugs")).toHaveValue("synthetic-pirkuma-ligums");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("processes a selected PDF through the real upload action, not the ready-made result", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(Response.json(purchaseCached));
    vi.stubEnv("BASE_URL", "/forest/");
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(extractContractPdfText).mockResolvedValue("[PAGE 1]\nPirkuma cena ir 48 500,00 EUR");
    renderPage();

    const file = new File(["%PDF-test"], "synthetic-pirkuma-ligums.pdf", {
      type: "application/pdf",
    });
    await user.upload(screen.getByLabelText(/Ievelciet līguma PDF/), file);
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Izvilkt datus" }));

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(extractContractPdfText).toHaveBeenCalledWith(file);
    expect(fetchMock).toHaveBeenCalledWith(
      "/forest/api/extract",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          text: "[PAGE 1]\nPirkuma cena ir 48 500,00 EUR",
          fileName: file.name,
        }),
      }),
    );
    expect(screen.queryByText("Sagatavots parauga rezultāts")).not.toBeInTheDocument();
  });

  it("retains the selected PDF after empty responses so the user can retry", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation(async () => new Response(null, { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(extractContractPdfText).mockResolvedValue("[PAGE 1]\nPirkuma cena ir 48 500,00 EUR");
    renderPage();

    const file = new File(["%PDF-test"], "testa-ligums.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText(/Ievelciet līguma PDF/), file);
    await user.click(screen.getByRole("button", { name: "Izvilkt datus" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Serveris neatgrieza pilnu analīzes rezultātu",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText(file.name)).toBeInTheDocument();

    fetchMock.mockResolvedValueOnce(Response.json(purchaseCached));
    await user.click(screen.getByRole("button", { name: "Izvilkt datus" }));
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(extractContractPdfText).toHaveBeenLastCalledWith(file);
  });
});
