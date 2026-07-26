import { http, HttpResponse } from "msw";

export const handlers = [
  // AUTH ENDPOINTS
  http.post("*/auth/login", async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, string>;
    if (body.email === "invalid@example.com") {
      return HttpResponse.json(
        { success: false, statusCode: 401, message: "Invalid credentials" },
        { status: 401 }
      );
    }
    return HttpResponse.json({
      success: true,
      data: {
        token: "mock-jwt-token",
        user: { id: "user-1", email: body.email || "user@example.com", name: "Test User", role: "MEMBER" },
      },
    });
  }),

  http.post("*/auth/register", async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, string>;
    if (body.email === "existing@example.com") {
      return HttpResponse.json(
        { success: false, statusCode: 400, message: "Email already registered" },
        { status: 400 }
      );
    }
    return HttpResponse.json({
      success: true,
      data: { id: "user-2", email: body.email || "new@example.com", message: "Registration successful" },
    });
  }),

  http.post("*/auth/verify-otp", async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, string>;
    if (body.code === "000000") {
      return HttpResponse.json(
        { success: false, statusCode: 400, message: "Invalid OTP code" },
        { status: 400 }
      );
    }
    return HttpResponse.json({
      success: true,
      data: { verified: true, token: "mock-verified-token" },
    });
  }),

  http.post("*/auth/forgot-password", async () => {
    return HttpResponse.json({
      success: true,
      data: { message: "Password reset link sent to your email" },
    });
  }),

  http.post("*/auth/reset-password", async () => {
    return HttpResponse.json({
      success: true,
      data: { message: "Password has been successfully reset" },
    });
  }),

  http.post("*/auth/verify-2fa", async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, string>;
    if (body.code === "000000") {
      return HttpResponse.json(
        { success: false, statusCode: 400, message: "Invalid 2FA code" },
        { status: 400 }
      );
    }
    return HttpResponse.json({
      success: true,
      data: { verified: true, token: "mock-2fa-token" },
    });
  }),

  http.get("*/auth/me", () => {
    return HttpResponse.json({
      success: true,
      data: { id: "user-1", email: "user@example.com", name: "Test User", role: "MEMBER" },
    });
  }),

  // WORKSPACES ENDPOINTS
  http.get("*/workspaces", () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: "ws-1", name: "Desk 101", hourlyRate: 100000, totalSeats: 10 },
        { id: "ws-2", name: "Private Office A", hourlyRate: 500000, totalSeats: 4 },
      ],
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });
  }),

  http.get("*/workspaces/:id", ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: { id: params.id, name: `Workspace ${params.id}`, hourlyRate: 100000, totalSeats: 10 },
    });
  }),

  // BOOKINGS ENDPOINTS
  http.get("*/bookings", () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: "booking-1",
          workspaceId: "ws-1",
          workspace: { name: "Desk 101" },
          planType: "DAILY",
          seatCount: 1,
          startDate: "2026-08-01",
          endDate: "2026-08-05",
          totalAmount: 500000,
          status: "CONFIRMED",
          createdAt: "2026-07-26T08:00:00Z",
        },
      ],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
  }),

  http.get("*/bookings/price-estimate", () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalAmount: 500000,
        planType: "DAILY",
        seatCount: 1,
        startDate: "2026-08-01",
        endDate: "2026-08-05",
      },
    });
  }),

  http.post("*/bookings/public/day-pass", () => {
    return HttpResponse.json({
      success: true,
      data: { id: "day-pass-1", message: "Day pass created successfully" },
    });
  }),

  http.get("*/bookings/:id", ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        id: params.id,
        workspaceId: "ws-1",
        workspace: { name: "Desk 101" },
        planType: "DAILY",
        seatCount: 1,
        startDate: "2026-08-01",
        endDate: "2026-08-05",
        totalAmount: 500000,
        status: "CONFIRMED",
        createdAt: "2026-07-26T08:00:00Z",
      },
    });
  }),

  http.post("*/bookings/:id/cancel", ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: { id: params.id, status: "CANCELLED" },
    });
  }),

  // PLANS ENDPOINTS
  http.get("*/plans", () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: "plan-1", name: "Basic", price: 1000000, interval: "MONTHLY" },
        { id: "plan-2", name: "Pro", price: 2500000, interval: "MONTHLY" },
      ],
    });
  }),

  http.get("*/memberships/plans", () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: "plan-1", name: "Basic", price: 1000000, interval: "MONTHLY" },
      ],
    });
  }),

  // INVOICES ENDPOINTS
  http.get("*/invoices*", () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: "inv-1",
          invoiceNumber: "INV-2026-001",
          amount: 500000,
          status: "PAID",
          createdAt: "2026-07-26T08:00:00Z",
        },
      ],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
  }),

  // NOTIFICATIONS ENDPOINTS
  http.get("*/notifications*", () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: "notif-1", title: "Welcome", message: "Welcome to ManageHub", read: false },
      ],
    });
  }),
];
