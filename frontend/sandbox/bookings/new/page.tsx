"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "../../components/useToast";

const bookingSchema = z
  .object({
    workspace: z.string().min(1, "Workspace is required"),
    planType: z.string().min(1, "Plan type is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    seatCount: z.number().min(1, "Seat count must be at least 1"),
    notes: z.string().optional(),
  })
  .refine((data) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (end <= start) {
        return {
          message: "End date must be after start date",
          path: ["endDate"],
        };
      }
    }
    return true;
  });

type BookingFormData = z.infer<typeof bookingSchema>;

const MOCK_WORKSPACES = [
  { id: "1", name: "The Hive" },
  { id: "2", name: "Focus Pod" },
  { id: "3", name: "Collab Room" },
  { id: "4", name: "Quiet Zone" },
  { id: "5", name: "Executive Suite" },
];

const PLAN_TYPES = [
  { id: "hourly", name: "Hourly" },
  { id: "daily", name: "Daily" },
  { id: "weekly", name: "Weekly" },
  { id: "monthly", name: "Monthly" },
];

export default function BookingForm() {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    mode: "onBlur",
    defaultValues: {
      workspace: "",
      planType: "",
      startDate: "",
      endDate: "",
      seatCount: 1,
      notes: "",
    },
  });

  const onSubmit = async (data: BookingFormData) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Booking submitted:", data);
    toast.success("Booking created successfully!");
    reset();
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Workspace <span className="text-red-500">*</span>
        </label>
        <select
          {...register("workspace")}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select a workspace</option>
          {MOCK_WORKSPACES.map((ws) => (
            <option key={ws.id} value={ws.name}>
              {ws.name}
            </option>
          ))}
        </select>
        {errors.workspace && (
          <p className="mt-1 text-sm text-red-600">
            {errors.workspace.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Plan Type <span className="text-red-500">*</span>
        </label>
        <select
          {...register("planType")}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select a plan</option>
          {PLAN_TYPES.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
        {errors.planType && (
          <p className="mt-1 text-sm text-red-600">{errors.planType.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            {...register("startDate")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {errors.startDate && (
            <p className="mt-1 text-sm text-red-600">
              {errors.startDate.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            {...register("endDate")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {errors.endDate && (
            <p className="mt-1 text-sm text-red-600">
              {errors.endDate.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Seat Count <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          {...register("seatCount", { valueAsNumber: true })}
          min="1"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {errors.seatCount && (
          <p className="mt-1 text-sm text-red-600">
            {errors.seatCount.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          {...register("notes")}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Any special requirements..."
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? "Creating Booking..." : "Create Booking"}
      </button>
    </form>
  );
}
