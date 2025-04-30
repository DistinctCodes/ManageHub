import React, { useState } from "react";
import { ErrorMessage, Field } from "formik";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import TextError from "./TextError";
import { nigeriaIcon } from "../assets";

function CustomInput(props) {
  const { type, label, name, placeholder } = props;
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="mt-2 space-y-1 relative">
      <label htmlFor={name} className="text-[11px] xl:text-[12px] block ">
        {label}
      </label>
      <div className="flex items-center relative">
        {type === "tel" && (
          <img src={nigeriaIcon} className="absolute left-3 w-5 h-5" />
        )}
        <Field
          type={showPassword ? "text" : type}
          name={name}
          placeholder={placeholder}
          className={`md:max-w-[392px] w-full py-2 px-3  placeholder:text-[11px] text-[11px] xl:text-[12px] border rounded-md border-[#d9dce1] bg-[#FAFAFA] ${
            type === "number"
              ? "[-moz-appearance:_textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
              : ""
          } ${type === "tel" ? "md:pl-10" : ""}`}
        />
        {type === "password" && (
          <span
            onClick={togglePasswordVisibility}
            className="absolute right-3 cursor-pointer text-gray-500"
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        )}
      </div>
      <ErrorMessage name={name} component={TextError} />
    </div>
  );
}

export default CustomInput;