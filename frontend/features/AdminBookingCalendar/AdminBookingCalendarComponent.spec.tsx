import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminBookingCalendarComponent } from "./AdminBookingCalendarComponent";
describe("AdminBookingCalendarComponent", () => {
  it("renders correctly", () => {
    render(<AdminBookingCalendarComponent />);
    expect(screen.getByText("Admin Calendar")).toBeDefined();
  });
});
