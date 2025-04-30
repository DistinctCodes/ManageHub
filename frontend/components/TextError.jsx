import React from "react";

function TextError(props) {
  return <div className="text-red-500 text-xs">{props.children}</div>;
}

export default TextError;
