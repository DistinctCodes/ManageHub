"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthState, useAuthActions } from "@/lib/store/authStore";
import { apiClient } from "@/lib/apiClient";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Camera, X } from "lucide-react";

const profileSchema = z.object({
  firstname: z.string().min(1, "First name is required"),
  lastname: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  headline: z.string().max(120).optional(),
  bio: z.string().max(500).optional(),
  company: z.string().max(100).optional(),
  website: z.string().url("Invalid URL").or(z.literal("")).optional(),
  linkedin: z.string().url("Invalid URL").or(z.literal("")).optional(),
  twitter: z.string().url("Invalid URL").or(z.literal("")).optional(),
  github: z.string().url("Invalid URL").or(z.literal("")).optional(),
  showInDirectory: z.boolean().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user } = useAuthState();
  const { initializeAuth } = useAuthActions();
  const [saving, setSaving] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const bio = watch("bio") ?? "";

  useEffect(() => {
    if (user) {
      reset({
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        showInDirectory: (user as Record<string, unknown>).showInDirectory as boolean ?? false,
      });
    }
  }, [user, reset]);

  const addSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const s = skillInput.trim();
      if (s && skills.length < 10 && !skills.includes(s)) {
        setSkills([...skills, s]);
        setSkillInput("");
      }
    }
  };

  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      await apiClient.patch(`/users/${user.id}`, { ...data, skills });
      setMessage({ type: "success", text: "Profile updated." });
      initializeAuth();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Update failed." });
    } finally {
      setSaving(false);
    }
  };

  const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingPic(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001/api"}/users/${user.id}/profile-picture`,
        { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}` }, body: formData }
      );
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      setProfilePic(json.data?.profilePicture || null);
      setMessage({ type: "success", text: "Profile picture updated." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setUploadingPic(false);
    }
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const initials = `${user.firstname?.[0] || ""}${user.lastname?.[0] || ""}`;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500 mt-1 text-sm">Manage your personal information.</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Avatar */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 flex items-center gap-5">
          <div className="relative">
            {profilePic ? (
              <img src={profilePic} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-500">
                {initials}
              </div>
            )}
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingPic}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 transition-colors">
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePictureUpload} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user.firstname} {user.lastname}</p>
            <p className="text-sm text-gray-400">{user.email}</p>
            <p className="text-xs text-gray-400 mt-1 capitalize">
              {user.role} &middot; Joined {new Date(user.createdAt).toLocaleDateString("en", { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Basic + Community form */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Edit profile</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">First name</label>
                <input {...register("firstname")} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200" />
                {errors.firstname && <p className="text-red-500 text-xs mt-1">{errors.firstname.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Last name</label>
                <input {...register("lastname")} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200" />
                {errors.lastname && <p className="text-red-500 text-xs mt-1">{errors.lastname.message}</p>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
              <input type="email" {...register("email")} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Phone (optional)</label>
              <input type="tel" {...register("phone")} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200" />
            </div>

            {/* Community section */}
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Community profile</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Headline</label>
                  <input {...register("headline")} placeholder="e.g. Product designer at Acme" className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Bio <span className="text-gray-300">{bio.length}/500</span>
                  </label>
                  <textarea {...register("bio")} rows={3} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Company</label>
                  <input {...register("company")} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Skills (press Enter to add, max 10)</label>
                  <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={addSkill}
                    disabled={skills.length >= 10} placeholder={skills.length >= 10 ? "Max 10 skills reached" : "e.g. React"}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50" />
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {skills.map((s) => (
                        <span key={s} className="flex items-center gap-1 text-xs bg-gray-50 text-gray-700 px-2 py-0.5 rounded-full border border-gray-100">
                          {s} <button type="button" onClick={() => removeSkill(s)}><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(["website", "linkedin", "twitter", "github"] as const).map((field) => (
                    <div key={field}>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 capitalize">{field}</label>
                      <input {...register(field)} placeholder={`https://${field}.com/...`} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200" />
                      {errors[field] && <p className="text-red-500 text-xs mt-1">{errors[field]?.message}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Directory toggle */}
            <div className="border-t border-gray-100 pt-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" {...register("showInDirectory")} className="mt-0.5 rounded border-gray-300 text-gray-900 focus:ring-gray-200" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Show me in the member directory</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Your name, headline, company, skills, and public social links will be visible to other members.
                  </p>
                </div>
              </label>
            </div>

            {message && (
              <p className={`text-sm ${message.type === "success" ? "text-emerald-600" : "text-red-500"}`}>{message.text}</p>
            )}

            <button type="submit" disabled={saving}
              className="px-5 py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
