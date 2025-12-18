import React from "react";
import Loading from "./Loading";

export default function PageLoader({ message = null }) {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <Loading size="lg" message={message} />
    </div>
  );
}
