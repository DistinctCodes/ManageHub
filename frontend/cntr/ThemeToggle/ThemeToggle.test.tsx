import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ThemeToggle from "./ThemeToggle";

const mockSetTheme = vi.fn();
let mockTheme = "light";

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
  }),
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    mockTheme = "light";
    mockSetTheme.mockClear();
  });

  it("renders null until mounted is true to prevent hydration mismatch", () => {
    // Prevent useEffect from running so mounted remains false
    const useEffectSpy = vi.spyOn(React, "useEffect").mockImplementation(() => {});
    const { container } = render(<ThemeToggle />);
    expect(container.firstChild).toBeNull();
    useEffectSpy.mockRestore();
  });

  it("renders the Moon icon when in light mode", () => {
    mockTheme = "light";
    render(<ThemeToggle />);
    expect(screen.getByTestId("moon-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("sun-icon")).not.toBeInTheDocument();
  });

  it("renders the Sun icon when in dark mode", () => {
    mockTheme = "dark";
    render(<ThemeToggle />);
    expect(screen.getByTestId("sun-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("moon-icon")).not.toBeInTheDocument();
  });

  it("toggles theme from light to dark on click", () => {
    mockTheme = "light";
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /toggle theme/i });
    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("toggles theme from dark to light on click", () => {
    mockTheme = "dark";
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /toggle theme/i });
    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });
});
