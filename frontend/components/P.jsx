import React from "react";

const P = ({ children, textSize, fontWeight }) => {
  return (
    <p className={`text-[11px] text-[#475467] -mt-1 font-[${fontWeight}]`}>
      {children}
    </p>
  );
};

export default P;
