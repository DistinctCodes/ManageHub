import React from 'react';

const CustomDropdown = ({ 
  label, 
  options = [], 
  value, 
  onChange, 
  placeholder = "Select an option",
  error,
  ...props 
}) => {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option, index) => (
          <option key={index} value={option.value || option}>
            {option.label || option}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-sm text-red-500">{error}</span>
      )}
    </div>
  );
};

export default CustomDropdown;