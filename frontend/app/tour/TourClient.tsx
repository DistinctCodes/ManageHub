"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(7, "Phone is required"),
  date: z.string().min(1, "Date is required"),
});
type FormData = z.infer<typeof schema>;

export default function TourClient() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    const res = await fetch(`${BASE_URL}/tours`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) setSubmitted(true);
    else alert("Booking failed. Please try again.");
  };

  if (submitted)
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <h2 className="text-2xl font-bold mb-2">Request Received!</h2>
        <p className="text-muted-foreground">
          We&apos;ve received your tour request. Check your email for confirmation.
        </p>
      </div>
    );

  return (
    <div className="max-w-md mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle>Book a Tour</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {(["name", "email", "phone"] as const).map((field) => (
              <div key={field}>
                <Label htmlFor={field}>
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </Label>
                <Input id={field} {...register(field)} />
                {errors[field] && (
                  <p className="text-destructive text-sm">
                    {errors[field]?.message}
                  </p>
                )}
              </div>
            ))}
            <div>
              <Label htmlFor="date">Preferred Date</Label>
              <Input id="date" type="date" {...register("date")} />
              {errors.date && (
                <p className="text-destructive text-sm">{errors.date.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Submitting…" : "Request Tour"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
