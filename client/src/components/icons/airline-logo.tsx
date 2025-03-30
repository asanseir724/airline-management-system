import React from "react";

export const AirlineLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M32 4L40 20H24L32 4Z" fill="currentColor" />
      <path d="M46 26H18L8 40H56L46 26Z" fill="currentColor" />
      <path d="M24 46H40L32 60L24 46Z" fill="currentColor" />
    </svg>
  );
};
