// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { ContractsPage } from "./ContractsPage";

describe("ContractsPage", () => {
  it("offers only owned samples and renders the cached incomplete result", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ContractsPage />
      </MemoryRouter>,
    );

    const samplePicker = screen.getByLabelText("Līguma paraugs");
    expect(within(samplePicker).getAllByRole("option")).toHaveLength(4);
    await user.selectOptions(samplePicker, "synthetic-pirkuma-nepilns");

    expect(screen.getByText("No kešatmiņas")).toBeInTheDocument();
    expect(screen.getByText("Nav norādīta pirkuma cena.")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Pārbaudāmie jautājumi/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Atvērt e-pastā" })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:"),
    );
  });
});
