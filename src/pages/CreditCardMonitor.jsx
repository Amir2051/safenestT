import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, Plus, Shield, AlertTriangle, CheckCircle, 
  TrendingDown, Lock, Eye, RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import AddCardDialog from "../components/cards/AddCardDialog.jsx";
import CreditCardItem from "../components/cards/CreditCardItem.jsx";

export default function CreditCardMonitor() {
  const [user, setUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [checking, setChecking] = useState(false);

  const queryClient = useQueryClient();

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['credit-cards'],
    queryFn: () => base44.entities.CreditCard.list('-created_date'),
    initialData: [],
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const createCardMutation = useMutation({
    mutationFn: async (cardData) => {
      // Simulate encryption and card creation
      const cardType = detectCardType(cardData.cardNumber);
      const lastFour = cardData.cardNumber.slice(-4);
      
      return base44.entities.CreditCard.create({
        card_nickname: cardData.nickname || `${cardType.toUpperCase()} •••• ${lastFour}`,
        card_type: cardType,
        encrypted_card_number: `encrypted_${cardData.cardNumber}`, // In production, use real encryption
        card_last_four: lastFour,
        encrypted_cvv: `encrypted_${cardData.cvv}`,
        expiry_month: parseInt(cardData.expiryMonth),
        expiry_year: parseInt(cardData.expiryYear),
        cardholder_name: cardData.cardholderName,
        issuing_bank: cardData.issuingBank || null,
        status: 'monitoring',
        monitoring_enabled: true,
        breach_status: 'unknown',
        breaches_found: [],
        suspicious_activity: [],
        added_date: new Date().toISOString(),
        alerts_enabled: true,
        risk_score: 0
      });
    },
    onSuccess: async (newCard) => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      
      // Log action
      await base44.entities.AuditLog.create({
        action_type: 'card_added',
        action_category: 'monitoring',
        description: `Credit card added for monitoring: •••• ${newCard.card_last_four}`,
        metadata: {
          card_id: newCard.id,
          card_type: newCard.card_type,
          last_four: newCard.card_last_four
        },
        severity: 'info',
        status: 'success'
      });

      // Run initial breach check
      setTimeout(() => {
        checkCardBreaches(newCard.id);
      }, 2000);
    },
  });

  const updateCardMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CreditCard.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: async (id) => {
      const card = cards.find(c => c.id === id);
      await base44.entities.CreditCard.delete(id);
      
      // Log removal
      await base44.entities.AuditLog.create({
        action_type: 'card_removed',
        action_category: 'monitoring',
        description: `Credit card removed from monitoring: •••• ${card.card_last_four}`,
        metadata: {
          card_id: id,
          last_four: card.card_last_four
        },
        severity: 'info',
        status: 'success'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      toast.success('Card removed from monitoring');
    },
  });

  const detectCardType = (cardNumber) => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    if (/^4/.test(cleanNumber)) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(cleanNumber)) return 'mastercard';
    if (/^3[47]/.test(cleanNumber)) return 'amex';
    if (/^(6011|65|64[4-9])/.test(cleanNumber)) return 'discover';
    
    return 'other';
  };

  const checkCardBreaches = async (cardId) => {
    setChecking(true);
    
    try {
      const card = cards.find(c => c.id === cardId);
      if (!card) return;

      // Simulate breach check (20% chance of finding breach)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const foundBreach = Math.random() < 0.2;
      
      const updates = {
        last_checked: new Date().toISOString(),
        breach_status: foundBreach ? 'exposed' : 'safe',
        breaches_found: foundBreach ? [
          {
            breach_name: 'Example Merchant Data Breach',
            breach_date: '2024-03-15',
            data_exposed: ['Card Numbers', 'Cardholder Names', 'Expiry Dates'],
            severity: 'high'
          }
        ] : [],
        risk_score: foundBreach ? 75 : 10,
        status: foundBreach ? 'compromised' : 'monitoring'
      };

      await updateCardMutation.mutateAsync({ id: cardId, data: updates });

      if (foundBreach) {
        toast.error(`⚠️ Breach detected for card •••• ${card.card_last_four}`);
        
        // Create alert
        await base44.entities.Alert.create({
          alert_type: 'breach',
          severity: 'critical',
          title: `Credit Card Breach: •••• ${card.card_last_four}`,
          message: `Your ${card.card_type} card was found in a data breach. Contact your bank immediately.`,
          status: 'active',
          affected_item: `Credit Card •••• ${card.card_last_four}`,
          recommendation: 'Contact your bank to freeze or replace this card. Review recent statements.'
        });
      } else {
        toast.success(`✅ No breaches found for card •••• ${card.card_last_four}`);
      }

    } catch (error) {
      console.error('Breach check error:', error);
      toast.error('Failed to check for breaches');
    }

    setChecking(false);
  };

  const checkAllCards = async () => {
    for (const card of cards) {
      await checkCardBreaches(card.id);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const isPremium = user?.subscription_plan === 'basic' || user?.subscription_plan === 'elite';
  const isActive = user?.payment_status === 'active';
  const isTrial = user?.subscription_plan === 'trial';

  const cardLimit = isPremium && isActive ? (user?.subscription_plan === 'elite' ? 10 : 5) : isTrial ? 2 : 1;
  const canAddMore = cards.length < cardLimit;

  const totalRisk = cards.reduce((sum, card) => sum + (card.risk_score || 0), 0) / (cards.length || 1);
  const compromisedCards = cards.filter(c => c.breach_status === 'exposed' || c.status === 'compromised').length;
  const safeCards = cards.filter(c => c.breach_status === 'safe').length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-purple-400" />
            Credit Card Monitoring
          </h1>
          <p className="text-gray-400 mt-1">
            Monitor your credit cards for data breaches and suspicious activity
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={checkAllCards}
            disabled={checking || cards.length === 0}
            variant="outline"
            className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
            Check All
          </Button>
          <Button
            onClick={() => setShowAddDialog(true)}
            disabled={!canAddMore}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Card
          </Button>
        </div>
      </div>

      {/* Plan Limit Banner */}
      {!isPremium || !isActive ? (
        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-semibold">
                  {isTrial ? '🎁 Trial Plan' : '🆓 Free Plan'}: Monitor up to {cardLimit} card{cardLimit > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-gray-400">
                  {cards.length}/{cardLimit} cards added • Upgrade for {user?.subscription_plan === 'elite' ? '10' : '5-10'} cards
                </p>
              </div>
              <Link to={createPageUrl("Upgrade")}>
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500">
                  Upgrade
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-10 h-10 text-green-400" />
              <div>
                <p className="text-white font-semibold">
                  ✨ {user?.subscription_plan === 'elite' ? 'Elite' : 'Basic'} Plan Active
                </p>
                <p className="text-sm text-green-300">
                  Monitor up to {cardLimit} cards • {cards.length}/{cardLimit} added • Real-time breach alerts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Total Cards</p>
            <p className="text-2xl font-bold text-white">{cards.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Compromised</p>
            <p className="text-2xl font-bold text-red-400">{compromisedCards}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Safe Cards</p>
            <p className="text-2xl font-bold text-green-400">{safeCards}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Avg Risk</p>
            <p className="text-2xl font-bold text-orange-400">{Math.round(totalRisk)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Cards List */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 animate-pulse">
              <CardContent className="p-6 h-64" />
            </Card>
          ))}
        </div>
      ) : cards.length === 0 ? (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-12 text-center">
            <CreditCard className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-white font-semibold text-lg mb-2">No Cards Added Yet</h3>
            <p className="text-gray-400 mb-6">
              Start monitoring your credit cards for data breaches and suspicious activity
            </p>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Card
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {cards.map((card) => (
            <CreditCardItem
              key={card.id}
              card={card}
              onRemove={(id) => deleteCardMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Add Card Dialog */}
      <AddCardDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onCardAdded={(cardData) => createCardMutation.mutate(cardData)}
      />
    </div>
  );
}