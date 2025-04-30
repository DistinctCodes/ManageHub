// import React from "react";
import CustomInput from "./CustomInput";
import CustomDropdown from "./CustomDropdown";
import { Form, Formik } from "formik";
import { Schemas } from "../utils/validationShema";
// import CustomButton from "./CustomButton";

// eslint-disable-next-line react/prop-types
function PersonalDetailsForm({ initialValues, onSubmit }) {
  return (
    <Formik
      initialValues={initialValues}
      onSubmit={(values, { setSubmitting }) => {
        setSubmitting(false);
        onSubmit(values);
      }}
      validationSchema={Schemas.newHubUserSchema}
    >
      {({ isSubmitting }) => (
        <Form className="max-w-4xl mx-auto mt-6 sm:mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 px-4 sm:px-6">
          <CustomInput
            name="name"
            type="text"
            label="Full Name"
            placeholder="Please enter your full name"
          />
          <CustomDropdown
            name="gender"
            label="Gender"
            options={[
              { value: "MALE", label: "MALE" },
              { value: "FEMALE", label: "FEMALE" },
            ]}
          />
          <CustomDropdown
            name="space_allocated"
            label="Space Allocated"
            options={[
              { value: "1", label: "1" },
              { value: "2", label: "2" },
              { value: "3", label: "3" },
              { value: "4", label: "4" },
            ]}
          />
          <CustomInput
            name="phone"
            type="tel"
            label="Phone Number"
            placeholder="08012345678"
          />
          <CustomInput
            name="email"
            type="email"
            label="Email"
            placeholder="Your email"
          />
          <CustomInput
            name="referral_code"
            type="number"
            label="Referral Code (Optional)"
            placeholder="Enter code"
          />
          <CustomDropdown
            name="subscription_type"
            label="Subscription Type"
            options={[
              { value: "DAILY", label: "DAILY" },
              { value: "WEEKLY", label: "WEEKLY" },
              { value: "MONTHLY", label: "MONTHLY" },
              { value: "QUARTERLY", label: "QUARTERLY" },
              { value: "YEARLY", label: "YEARLY" },
            ]}
          />
          <CustomDropdown
            name="referral_channel"
            label="How did you hear about us"
            defaultValue="Twitter, a friend..."
            options={[
              { value: "friend", label: "Friend" },
              { value: "twitter", label: "Twitter" },
              { value: "email", label: "Email" },
            ]}
          />

          <div className="col-span-1 md:col-span-2 mt-4 text-end ">
            <button
              type="submit"
              className=" bg-black md:w-[194px] text-white px-12 py-2 rounded-full"
            >
              {isSubmitting ? "Continuing.." : "Continue"}
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
}

export default PersonalDetailsForm;
