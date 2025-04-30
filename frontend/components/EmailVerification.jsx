import React from "react";

function EmailVerification({ email, onSubmit, onBack }) {
  // const handleSubmit = (values, { setSubmitting }) => {
  //   const pinValue = values.pin;
  //   setSubmitting(false);
  //   onSubmit({ pin: pinValue });
  // };
  return (
    <div className="flex flex-col gap-10 items-center">
      <div>
        <h1 className="font-caslon text-black font-semibold text-4xl">
          Verify your email
        </h1>
        <p className="text-[#3B3F49] text-xl font-semibold">
          We’ve sent an email verification link to your email
        </p>
        <p className="text-[#3B3F49]">{email}</p>
      </div>

      <button
        // onClick={}
        type="submit"
        className="bg-black md:w-[194px] text-white px-12 py-2 rounded-full"
      >
        Resend
      </button>
    </div>
  );
}

export default EmailVerification;
