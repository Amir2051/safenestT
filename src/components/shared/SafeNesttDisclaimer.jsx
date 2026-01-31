import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Shield } from "lucide-react";

export default function SafeNesttDisclaimer({ variant = "default" }) {
  if (variant === "short") {
    return (
      <Alert className="bg-yellow-500/10 border-yellow-500/30">
        <AlertTriangle className="h-4 w-4 text-yellow-400" />
        <AlertDescription className="text-gray-300 text-xs">
          <strong>Disclaimer:</strong> SafeNestt provides investigative tools for informational purposes only. 
          We are not law enforcement and do not guarantee results. You are responsible for how you use this information 
          and must comply with all applicable laws.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="bg-blue-500/10 border-blue-500/30">
      <Shield className="h-4 w-4 text-blue-400" />
      <AlertDescription className="text-gray-300 text-sm">
        <strong className="text-white">SafeNestt Disclaimer</strong>
        <p className="mt-2">
          SafeNestt provides investigative and safety tools for informational purposes only. 
          We are not a law enforcement agency and do not guarantee specific outcomes or recovery of funds. 
          Users are solely responsible for how they use the information provided, and all data is handled 
          in accordance with our Privacy Policy. By using SafeNestt, you acknowledge these terms and agree 
          to use our services lawfully and ethically.
        </p>
      </AlertDescription>
    </Alert>
  );
}