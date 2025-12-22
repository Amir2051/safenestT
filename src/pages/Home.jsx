import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to Dashboard as the main landing page
    navigate(createPageUrl('Dashboard'));
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}