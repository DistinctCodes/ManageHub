import { useField, useFormikContext } from "formik";
import { IoCloudUploadOutline } from "react-icons/io5";
import { useRef } from "react";

export function FileUpload({ label, name }) {
  const [field, meta, helpers] = useField(name);
  const { setFieldValue } = useFormikContext();
  const fileInputRef = useRef();

  const handleFileChange = (event) => {
    const file = event.currentTarget.files?.[0];
    if (file) {
      // Convert the file to Base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setFieldValue(name, base64String); // Set the Base64 string in Formik
      };
      reader.readAsDataURL(file); // Read file as Base64
    }
  };
  return (
    <div>
      {label && (
        <label className="text-[11px] lg:text-[12px]" htmlFor={name}>
          {label}
        </label>
      )}
      <div className="border-2 bg-white border-dashed rounded-xl p-3 flex flex-col justify-center gap-4">
        <div className="flex justify-between text-sm text-gray-600">
          <div className="flex gap-3 items-center">
            <IoCloudUploadOutline className="h-6 w-6" />
            <div>
              <span className="text-[#101928]">Tap to Upload</span>
              <p className="text-xs text-[#98A2B3]">
                SVG, PNG, JPG, GIF | 10MB max.
              </p>
            </div>
          </div>
          <button
            className="bg-[#1D2939] text-white py-2 px-4 rounded-lg"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload
          </button>
        </div>
        <input
          ref={fileInputRef}
          id={name}
          name={name}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept=".svg,.png,.jpg,.jpeg,.gif"
        />
        {field.value && (
          <div className="text-sm text-gray-600">
            Selected file: {field.value.name}
          </div>
        )}
      </div>
      {meta.touched && meta.error && (
        <div className="text-sm text-red-500">{meta.error}</div>
      )}
    </div>
  );
}