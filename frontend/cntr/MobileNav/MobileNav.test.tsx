import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MobileNav from "./MobileNav";

let mockPathname = "/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

describe("MobileNav", () => {
  beforeEach(() => {
    mockPathname = "/dashboard";
  });

  it("renders all four navigation items", () => {
    render(<MobileNav />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Bookings")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("applies the sm:hidden Tailwind class to hide on larger viewports", () => {
    const { container } = render(<MobileNav />);
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer.className).toContain("sm:hidden");
  });

  it("uses Next.js Link component with correct href values", () => {
    render(<MobileNav />);

    const dashboardLink = screen.getByTestId("mobile-nav-dashboard");
    const bookingsLink = screen.getByTestId("mobile-nav-bookings");
    const notificationsLink = screen.getByTestId("mobile-nav-notifications");
    const profileLink = screen.getByTestId("mobile-nav-profile");

    expect(dashboardLink.getAttribute("href")).toBe("/dashboard");
    expect(bookingsLink.getAttribute("href")).toBe("/bookings");
    expect(notificationsLink.getAttribute("href")).toBe("/notifications");
    expect(profileLink.getAttribute("href")).toBe("/profile");
  });

  it("highlights the active tab based on pathname", () => {
    mockPathname = "/bookings";
    render(<MobileNav />);

    const bookingsIcon = screen.getByTestId("nav-icon-bookings");
    const dashboardIcon = screen.getByTestId("nav-icon-dashboard");

    expect(bookingsIcon.className).toContain("text-gray-900");
    expect(dashboardIcon.className).toContain("text-gray-400");
  });

  it("renders notification unread badge when unreadCount > 0", () => {
    render(<MobileNav unreadCount={5} />);
    const badge = screen.getByTestId("unread-badge");
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe("5");
  });

  it("does not render notification unread badge when unreadCount is 0", () => {
    render(<MobileNav unreadCount={0} />);
    expect(screen.queryByTestId("unread-badge")).not.toBeInTheDocument();
  });
});
