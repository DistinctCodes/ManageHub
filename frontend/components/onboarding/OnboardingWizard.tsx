"use client";

import { useState } from "react";
import { useAuthState, useAuthActions } from "@/lib/store/authStore";
import { apiClient } from "@/lib/apiClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { CloudinaryUploadWidget } from "@/components/CloudinaryUploadWidget";

const OnboardingWizard = () => {
  const { user } = useAuthState();
  const { updateProfile } = useAuthActions();
  const [isOpen, setIsOpen] = useState(true);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    profilePicture: user?.profilePicture || "",
    firstName: user?.firstname || "",
    lastName: user?.lastname || "",
    bio: "",
    interests: [],
    phone: "",
    otp: "",
  });

  const handleNext = () => setStep((prev) => prev + 1);
  const handleBack = () => setStep((prev) => prev - 1);

  const handleProfilePictureUpload = (url: string) => {
    setFormData((prev) => ({ ...prev, profilePicture: url }));
  };

  const handleFinish = async () => {
    try {
      await updateProfile({
        profilePicture: formData.profilePicture,
        firstname: formData.firstName,
        lastname: formData.lastName,
        bio: formData.bio,
        interests: formData.interests,
        onboardingCompleted: true,
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  if (!user || user.onboardingCompleted) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome to ManageHub!</DialogTitle>
          <DialogDescription>Let's get your profile set up.</DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div>
            <h3 className="text-lg font-semibold">Step 1: Profile Photo</h3>
            <CloudinaryUploadWidget onUpload={handleProfilePictureUpload} />
            <Button onClick={handleNext}>Next</Button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="text-lg font-semibold">Step 2: About You</h3>
            <Input
              placeholder="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            <Input
              placeholder="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
            <Textarea
              placeholder="Bio (max 200 chars)"
              maxLength={200}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            />
            <Button onClick={handleBack}>Back</Button>
            <Button onClick={handleNext}>Next</Button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="text-lg font-semibold">Step 3: Phone Number</h3>
            <Input
              placeholder="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Button onClick={handleBack}>Back</Button>
            <Button onClick={handleNext}>Next</Button>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="text-lg font-semibold">Step 4: OTP Verification</h3>
            <Input
              placeholder="OTP"
              value={formData.otp}
              onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
            />
            <Button onClick={handleBack}>Back</Button>
            <Button onClick={handleFinish}>Finish</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingWizard;