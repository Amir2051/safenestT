
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, Phone, Video, Mail, Calendar, Clock, Award, CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AttorneyConsultations({ consultations, properties, selectedProperty }) {
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [propertyId, setPropertyId] = useState(selectedProperty?.id || '');
  const [consultationType, setConsultationType] = useState('initial_consultation');
  const [userMessage, setUserMessage] = useState('');

  const queryClient = useQueryClient();

  const requestConsultationMutation = useMutation({
    mutationFn: async () => {
      if (!propertyId || !userMessage) {
        throw new Error('Please fill in all fields');
      }

      const currentUser = await base44.auth.me();

      const consultation = await base44.entities.AttorneyConsultation.create({
        property_id: propertyId,
        consultation_type: consultationType,
        status: 'requested',
        requested_date: new Date().toISOString(),
        consultation_method: 'phone',
        user_message: userMessage,
        consultation_fee: 0 // Free for SafeNest users
      });

      // Check if user came from a referral
      const urlParams = new URLSearchParams(window.location.search);
      const referralCode = urlParams.get('ref') || localStorage.getItem('pending_referral_code');
      
      if (referralCode) {
        // Find existing verified referral for the current user and code
        const referrals = await base44.entities.Referral.filter({ 
          referred_email: currentUser.email,
          referrer_code: referralCode,
          status: 'verified' // Only process verified referrals
        });

        if (referrals.length > 0) {
          const referral = referrals[0];
          
          // Complete the referral
          await base44.entities.Referral.update(referral.id, {
            status: 'completed',
            completed_date: new Date().toISOString(),
            completion_action: 'legal_consultation',
            consultation_id: consultation.id,
            referred_user_activity: {
              ...(referral.referred_user_activity || {}),
              consultations_requested: (referral.referred_user_activity?.consultations_requested || 0) + 1
            }
          });

          // Award bonus to referrer
          const referrerUsers = await base44.entities.User.filter({ email: referral.referrer_email });
          if (referrerUsers.length > 0) {
            const referrer = referrerUsers[0];
            const currentStats = referrer.referral_stats || {};
            
            await base44.entities.User.update(referrer.id, {
              referral_stats: {
                ...currentStats,
                completed_referrals: (currentStats.completed_referrals || 0) + 1,
                legal_referrals: (currentStats.legal_referrals || 0) + 1,
                bonus_months_earned: (currentStats.bonus_months_earned || 0) + 1, // Grant 1 month premium for legal referral
                total_credits_earned: (currentStats.total_credits_earned || 0) + 50 // Grant 50 credits for legal referral
              }
            });

            await base44.entities.Referral.update(referral.id, {
              status: 'rewarded',
              rewarded_date: new Date().toISOString(),
              bonus_granted: true,
              bonus_type: 'credits_and_premium', // More specific bonus type
              bonus_value: { credits: 50, premium_months: 1 } // Store bonus details
            });

            // Send notification
            await base44.integrations.Core.SendEmail({
              to: referral.referrer_email,
              subject: '🎉 Premium Referral Bonus - Legal Support!',
              body: `Excellent! ${referral.referred_name} just requested a legal consultation using your referral code.\n\nYour Premium Rewards:\n• +50 Premium Credits\n• +1 Month Premium Access\n• Legal Protection Advocate Badge (new badge to be implemented)\n\nLegal Support referrals earn 50 credits (vs 30 for property referrals)!\n\nTotal Referrals: ${(currentStats.completed_referrals || 0) + 1}\nTotal Credits: ${(currentStats.total_credits_earned || 0) + 50}\n\nSafeNest Referral Program`
            });
          }

          localStorage.removeItem('pending_referral_code'); // Clear the pending code after processing
        }
      }

      // Create legal action
      await base44.entities.LegalAction.create({
        property_id: propertyId,
        action_type: 'attorney_consulted',
        action_date: new Date().toISOString(),
        description: `Attorney consultation requested: ${consultationType}`,
        status: 'pending',
        priority: 'high'
      });

      // Log audit
      await base44.entities.AuditLog.create({
        action_type: 'settings_updated',
        action_category: 'security',
        description: 'Attorney consultation requested',
        metadata: {
          property_id: propertyId,
          consultation_type: consultationType
        },
        severity: 'info',
        status: 'success'
      });

      return consultation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attorney-consultations'] });
      setShowRequestDialog(false);
      setUserMessage('');
      toast.success('✅ Consultation request submitted! An attorney will contact you within 24 hours.');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to request consultation');
    }
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'scheduled':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'in_progress':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'requested':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Request Consultation */}
      <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="w-8 h-8 text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">
                👨‍⚖️ Connect with Licensed NYC Attorneys
              </h3>
              <p className="text-green-300 text-sm mb-4">
                Get expert legal advice from verified real estate attorneys specializing in NYC property law and title fraud.
              </p>
              <ul className="text-sm text-gray-300 space-y-1 mb-4">
                <li>• <strong>Free Initial Consultation:</strong> 30-minute phone/video call included</li>
                <li>• <strong>NYC Bar Verified:</strong> All attorneys licensed in New York State</li>
                <li>• <strong>Title Fraud Specialists:</strong> Experience with deed theft and ACRIS disputes</li>
                <li>• <strong>Quick Response:</strong> Most consultations scheduled within 24 hours</li>
              </ul>
              <Button
                onClick={() => setShowRequestDialog(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                <Phone className="w-4 h-4 mr-2" />
                Request Free Consultation
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consultations List */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Your Consultations ({consultations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {consultations.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg">No Consultations Yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Request a consultation to get expert legal advice
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {consultations.map(consultation => {
                const property = properties.find(p => p.id === consultation.property_id);
                
                return (
                  <div
                    key={consultation.id}
                    className="bg-[#0f1419] rounded-lg p-5 border border-cyan-500/10"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="w-5 h-5 text-green-400" />
                          <h3 className="text-white font-bold">
                            {consultation.consultation_type.replace('_', ' ').toUpperCase()}
                          </h3>
                          <Badge className={`${getStatusColor(consultation.status)} border text-xs`}>
                            {consultation.status}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-400 mb-2">
                          Property: {property?.address || 'Unknown'}
                        </p>

                        {consultation.attorney_assigned && (
                          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg mb-3">
                            <p className="text-green-400 font-bold text-sm mb-1">
                              Attorney Assigned
                            </p>
                            <p className="text-white text-sm">
                              {consultation.attorney_assigned.attorney_name}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {consultation.attorney_assigned.firm_name}
                            </p>
                            {consultation.attorney_assigned.license_verified && (
                              <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-500/50 border text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Bar Verified
                              </Badge>
                            )}
                          </div>
                        )}

                        {consultation.scheduled_date && (
                          <div className="flex items-center gap-2 text-sm text-cyan-400 mb-2">
                            <Calendar className="w-4 h-4" />
                            Scheduled: {new Date(consultation.scheduled_date).toLocaleString()}
                          </div>
                        )}

                        <div className="text-xs text-gray-500">
                          Requested: {new Date(consultation.requested_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {consultation.attorney_notes && (
                      <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg mt-3">
                        <p className="text-purple-400 font-bold text-xs mb-1">Attorney Notes:</p>
                        <p className="text-gray-300 text-sm">{consultation.attorney_notes}</p>
                      </div>
                    )}

                    {consultation.recommendations && consultation.recommendations.length > 0 && (
                      <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg mt-3">
                        <p className="text-cyan-400 font-bold text-xs mb-2">Recommendations:</p>
                        <ul className="text-gray-300 text-sm space-y-1">
                          {consultation.recommendations.map((rec, idx) => (
                            <li key={idx}>• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Request Attorney Consultation</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-semibold">Select Property</label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                  <SelectValue placeholder="Choose property..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  {properties.map(property => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-semibold">Consultation Type</label>
              <Select value={consultationType} onValueChange={setConsultationType}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  <SelectItem value="initial_consultation">Initial Consultation</SelectItem>
                  <SelectItem value="urgent_matter">Urgent Matter</SelectItem>
                  <SelectItem value="case_review">Case Review</SelectItem>
                  <SelectItem value="document_review">Document Review</SelectItem>
                  <SelectItem value="strategy_session">Strategy Session</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-semibold">Describe Your Situation</label>
              <Textarea
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder="Please describe your legal issue, any suspicious activity, and what you need help with..."
                className="bg-[#0f1419] border-cyan-500/20 text-white h-32"
              />
            </div>

            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-sm">
                <strong>✅ FREE Consultation:</strong> Your first 30-minute consultation is completely free. 
                An attorney will review your case and provide initial recommendations at no cost.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowRequestDialog(false)}
                variant="outline"
                className="flex-1 border-gray-500/20 text-gray-400"
              >
                Cancel
              </Button>
              <Button
                onClick={() => requestConsultationMutation.mutate()}
                disabled={!propertyId || !userMessage || requestConsultationMutation.isPending}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                {requestConsultationMutation.isPending ? 'Submitting...' : 'Request Consultation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
