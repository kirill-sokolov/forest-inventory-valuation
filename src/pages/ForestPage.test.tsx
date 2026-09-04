// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { Inventory } from "@engine/inventory/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ForestPage, publicFixture } from "./ForestPage";

afterEach(cleanup);

describe("ForestPage", () => {
  it("recalculates the public oracle when the flagged stand is excluded", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ForestPage initialInventory={publicFixture} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Cērtamais apjoms: 689 m3/)).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "iekļaut" }));
    expect(screen.getByText(/Cērtamais apjoms: 518 m3/)).toBeInTheDocument();
  });

  it("warns when an allocated assortment has no price and keeps finite output", async () => {
    const user = userEvent.setup();
    renderPage(publicFixture);

    await user.clear(screen.getByRole("spinbutton", { name: "Finieris A B cena EUR/m3" }));

    expect(
      screen.getByRole("button", { name: /Finieris A.*nav norādīta cena/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument();
  });

  it("copies the extended engine report", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderPage(publicFixture);

    await user.click(screen.getByRole("button", { name: "Kopēt" }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Nogabalu izvērtējums"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("31,50 m³ nav novērtēti"));
  });

  it("uses unique controls and report labels for repeated stand numbers", () => {
    renderPage(inventoryWithRepeatedStandNumber());

    expect(document.getElementById("stand-1-5-formula")).toBeInTheDocument();
    expect(document.getElementById("stand-2-5-formula")).toBeInTheDocument();
    expect(document.getElementById("stand-1-5-include")).toBeInTheDocument();
    expect(document.getElementById("stand-2-5-include")).toBeInTheDocument();
    expect(screen.getByText(/Kailcirtes: 1\.kv\.\/5\.nog;2\.kv\.\/5\.nog/)).toBeInTheDocument();
    expect(screen.getByText(/1\. kv\. \/ 5\. nog\./)).toBeInTheDocument();
  });

  it("ignores negative cost and profit inputs without crashing", () => {
    renderPage(publicFixture);

    const harvesting = screen.getByRole("spinbutton", { name: /Ciršana/ });
    const profit = screen.getByRole("spinbutton", { name: /Peļņa/ });
    fireEvent.change(harvesting, { target: { value: "-1" } });
    fireEvent.change(profit, { target: { value: "-5" } });

    expect(harvesting).toHaveValue(11);
    expect(profit).toHaveValue(10);
    expect(screen.getByText(/Cērtamais apjoms: 689 m3/)).toBeInTheDocument();
  });
});

function renderPage(inventory: Inventory): void {
  render(
    <MemoryRouter>
      <ForestPage initialInventory={inventory} />
    </MemoryRouter>,
  );
}

function inventoryWithRepeatedStandNumber(): Inventory {
  const source = publicFixture.quarters[0]?.stands.find((stand) => stand.number === 5);
  if (!source) throw new Error("Public fixture is missing stand 5");
  const copy = (): typeof source => ({
    ...source,
    notes: {
      ...source.notes,
      protection: source.notes.protection ? { ...source.notes.protection } : undefined,
    },
    flags: [...source.flags],
  });
  return {
    property: { ...publicFixture.property },
    totals: { ...publicFixture.totals },
    quarters: [
      { number: 1, stands: [copy()] },
      { number: 2, stands: [copy()] },
    ],
  };
}
