import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WalletError from "../error";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
describe("WalletError", () => {
  it("shows the boundary error and lets the user retry", () => {
    const reset = vi.fn();
    render(<WalletError error={new Error("wallet failed")} reset={reset} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong loading your wallet");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
