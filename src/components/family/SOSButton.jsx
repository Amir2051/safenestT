import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, MapPin, Phone, CheckCircle, Volume2 } from "lucide-react";
import { toast } from "sonner";

export default function SOSButton({ groupId, userEmail, userName, isChild = false }) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [locationData, setLocationData] = useState(null);
  const [audioRecording, setAudioRecording] = useState(false);
  const queryClient = useQueryClient();

  const sosMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('sosFamilyService', {
        endpoint: 'trigger-sos',
        ...data
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['family-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['family-locations-active'] });
      
      toast.success('🆘 SOS Alert Sent!', {
        description: `All family members notified. Help is on the way!`,
        duration: 8000
      });
      
      setSosActive(false);
      setShowConfirmDialog(false);
    },
    onError: (error) => {
      toast.error('Failed to send SOS: ' + error.message);
      setSosActive(false);
    }
  });

  // Countdown timer
  useEffect(() => {
    if (sosActive && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (sosActive && countdown === 0) {
      handleSOSTrigger();
    }
  }, [sosActive, countdown]);

  const handleSOSPress = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmSOS = () => {
    setShowConfirmDialog(false);
    setSosActive(true);
    setCountdown(3);
    
    // Start getting location immediately
    getLocation();
    
    // Start audio recording if supported
    if (isChild) {
      startAudioRecording();
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const data = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed_kmh: position.coords.speed ? position.coords.speed * 3.6 : null
        };
        
        // Get battery info
        if (navigator.getBattery) {
          try {
            const battery = await navigator.getBattery();
            data.battery_level = Math.round(battery.level * 100);
            data.is_charging = battery.charging;
          } catch (e) {
            // Battery API not available
          }
        }
        
        setLocationData(data);
      },
      (error) => {
        console.error('Location error:', error);
        // Continue with SOS even without location
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioRecording(true);
      
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        // Upload audio to server
        try {
          const file = new File([audioBlob], `sos-audio-${Date.now()}.webm`, { type: 'audio/webm' });
          const uploadResponse = await base44.integrations.Core.UploadFile({ file });
          
          // Store audio URL in location data
          if (locationData) {
            locationData.audio_url = uploadResponse.file_url;
          }
        } catch (uploadError) {
          console.error('Failed to upload audio:', uploadError);
        }
        
        stream.getTracks().forEach(track => track.stop());
        setAudioRecording(false);
      };
      
      mediaRecorder.start();
      
      // Stop recording after 10 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 10000);
      
    } catch (error) {
      console.error('Audio recording error:', error);
      // Continue without audio
    }
  };

  const handleSOSTrigger = async () => {
    const sosData = {
      group_id: groupId,
      member_email: userEmail,
      member_name: userName,
      location: locationData,
      has_audio: audioRecording,
      timestamp: new Date().toISOString()
    };
    
    sosMutation.mutate(sosData);
  };

  const handleCancel = () => {
    setSosActive(false);
    setShowConfirmDialog(false);
    setCountdown(3);
    setLocationData(null);
    setAudioRecording(false);
  };

  return (
    <>
      {/* SOS Button */}
      <Button
        onClick={handleSOSPress}
        disabled={sosActive || sosMutation.isPending}
        className={`${
          isChild
            ? 'w-full h-24 text-2xl font-bold bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
            : 'w-full h-16 text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700'
        } shadow-lg shadow-red-500/30 transition-all ${
          sosActive ? 'animate-pulse' : ''
        }`}
      >
        {sosActive ? (
          <>
            <Loader2 className="w-6 h-6 mr-3 animate-spin" />
            Sending SOS... {countdown}
          </>
        ) : sosMutation.isPending ? (
          <>
            <Loader2 className="w-6 h-6 mr-3 animate-spin" />
            Alerting Family...
          </>
        ) : (
          <>
            <AlertTriangle className="w-6 h-6 mr-3" />
            🆘 SOS EMERGENCY
          </>
        )}
      </Button>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-gradient-to-br from-red-900/95 to-orange-900/95 border-red-500/50 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-400 animate-pulse" />
              Emergency SOS Alert
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-200 text-sm font-semibold mb-2">
                This will immediately:
              </p>
              <ul className="space-y-2 text-red-100 text-sm">
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-400" />
                  Share your exact location with all family members
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Send urgent notifications to everyone
                </li>
                {isChild && (
                  <li className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-red-400" />
                    Record 10 seconds of audio (requires mic permission)
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-red-400" />
                  Log the emergency event
                </li>
              </ul>
            </div>

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-200 text-xs text-center">
                ⚠️ Only use in real emergencies. False alarms may result in panic.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1 border-white/30 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSOS}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Confirm SOS
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active SOS Status */}
      {sosActive && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-gradient-to-br from-red-900 to-orange-900 border-4 border-red-500 rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <AlertTriangle className="w-12 h-12 text-red-400" />
              </div>
              
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Sending SOS Alert
                </h2>
                <p className="text-red-200 text-lg">
                  Help is on the way...
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-center gap-3 text-red-100">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Getting your location...</span>
                  {locationData && <CheckCircle className="w-5 h-5 text-green-400" />}
                </div>
                
                {isChild && (
                  <div className="flex items-center justify-center gap-3 text-red-100">
                    <Volume2 className="w-5 h-5" />
                    <span>Recording audio...</span>
                    {audioRecording && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                  </div>
                )}

                <div className="text-6xl font-bold text-white">
                  {countdown}
                </div>
              </div>

              <Button
                onClick={handleCancel}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}