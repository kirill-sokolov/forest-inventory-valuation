// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { DecisionsPage } from "./DecisionsPage";

describe("DecisionsPage", () => {
  it("renders the decision headings and bullet lists from DECISIONS.md", () => {
    render(
      <MemoryRouter>
        <DecisionsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Lēmumi par prototipu");
    expect(
      screen.getByRole("heading", { name: "Rīki un kāpēc tieši tie" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Pieņēmumi un atklātie jautājumi" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Pārbaude pret uzdevuma piemēru" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("list").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText(/28 249 EUR jeb 27,19 EUR\/m³/)).toBeInTheDocument();
  });
});
