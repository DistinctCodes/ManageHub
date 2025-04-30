import CustomDropdown from "./CustomDropdown";
import CustomInput from "./CustomInput";
import { Formik, Form } from "formik";
import { FileUpload } from "./CustomFileUpload";
import { Schemas } from "../utils/validationShema";
import CustomButton from "./CustomButton";

function AdditionalDetailsForm({ initialValues, onSubmit, onBack }) {
  const handleBack = () => {
    onBack();
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={(values, { setSubmitting }) => {
        onSubmit(values, { setSubmitting });
      }}
      validationSchema={Schemas.additionalDetailsSchema}
    >
      {({ isSubmitting }) => {
        return (
          <Form className="max-w-4xl mx-auto sm:gap-6 px-4 sm:px-6 ">
            <p className="text-[#3B3F49] text-sm font-semibold">
              Additional Information
            </p>
            <div className="mt-2 sm:mt-3 grid grid-cols-1 md:grid-cols-2 gap-6  ">
              <CustomDropdown
                name="IdType"
                label="Identification Type"
                options={[
                  { value: "NIN", label: "NIN" },
                  { value: "Drivers License", label: "Drivers License" },
                  { value: "BVN", label: "BVN" },
                  { value: "Passport", label: "Passport" },
                ]}
              />
              <CustomInput
                name="contactAddress"
                type="text"
                label="Contact Address"
                placeholder="Enter your contact address"
              />
              <div className="col-span-1 md:col-span-2">
                <FileUpload name="IdDocument" label="Upload ID document" />
              </div>
              <CustomInput
                name="nextOfKin"
                type="text"
                label="Next of Kin"
                placeholder="NOK name"
              />
              <CustomInput
                name="nextOfKinPhone"
                type="tel"
                label="Next of Kin Phone"
                placeholder="Phone Number of NOK"
              />
              <FileUpload name="photo" label="Passport/Profile Photo" />

              <FileUpload
                name="signedLeaseAgreementCopy"
                label="Signed Lease Agreement Copy"
              />

              <div className="col-span-1 md:col-span-2 mt-4 flex justify-between ">
                <CustomButton type="button" label="Back" onClick={handleBack} />

                <CustomButton
                  isLoading={isSubmitting}
                  label="Get In"
                  loadingText="Registering User.."
                  type="submit"
                />
              </div>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}

export default AdditionalDetailsForm;
