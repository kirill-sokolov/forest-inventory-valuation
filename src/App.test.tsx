// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the landing page", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Meža inventarizācijas, līgumu un zvanu procesu automatizācija",
    );
    expect(screen.getByRole("link", { name: /Izvērtēt zvanu kvalitāti/ })).toHaveAttribute(
      "href",
      "/zvani",
    );
  });
});
