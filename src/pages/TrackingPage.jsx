import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

export default function TrackingPage() {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const logVisit = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const trackingCode = urlParams.get('t');

      if (!trackingCode) {
        setStatus('error');
        return;
      }

      try {
        // Collect visitor data
        const visitorData = {
          user_agent: navigator.userAgent,
          referrer: document.referrer || 'Direct',
          screen_width: window.screen.width,
          screen_height: window.screen.height,
          language: navigator.language,
          // We let the server resolve IP and Location for better accuracy and to avoid ad-blockers
        };

        // Log the click
        await base44.functions.invoke('trackingService', {
          endpoint: 'log-click',
          tracking_code: trackingCode,
          visitor_data: visitorData
        });

        // Redirect to a harmless page after a delay
        setTimeout(() => {
          setStatus('redirecting');
          setTimeout(() => {
            window.location.href = 'https://www.google.com/search?q=cryptocurrency+security+tips';
          }, 1500);
        }, 2000);

      } catch (error) {
        console.error('Error:', error);
        setStatus('redirecting');
        setTimeout(() => {
          window.location.href = 'https://www.google.com';
        }, 1500);
      }
    };

    logVisit();
  }, []);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center p-8">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-700">Loading...</h1>
            <p className="text-gray-500 mt-2">Please wait while we verify your request.</p>
          </>
        )}
        
        {status === 'redirecting' && (
          <>
            <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-700">Redirecting...</h1>
            <p className="text-gray-500 mt-2">You will be redirected shortly.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-xl font-semibold text-gray-700">Page Not Found</h1>
            <p className="text-gray-500 mt-2">The page you're looking for doesn't exist.</p>
          </>
        )}
      </div>
    </div>
  );
}