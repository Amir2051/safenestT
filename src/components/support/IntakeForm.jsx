import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, ArrowRight } from "lucide-react";

export default function IntakeForm({ onSubmit }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
      issueType: "",
      subject: "",
      description: ""
  });

  const handleSubmit = (e) => {
      e.preventDefault();
      // Format the data for the chat initiation
      const initialMessages = [
          { question: "Issue Type", answer: formData.issueType },
          { question: "Subject", answer: formData.subject },
          { question: "Description", answer: formData.description }
      ];
      onSubmit({ subject: formData.subject, initial_messages: initialMessages });
  };

  return (
    <div className="bg-[#1a2332] p-6 rounded-lg border border-gray-700 max-w-md w-full mx-auto">
        <div className="text-center mb-6">
            <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Contact Support</h2>
            <p className="text-gray-400 text-sm">Tell us how we can help you today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label className="text-gray-300">What do you need help with?</Label>
                <Select 
                    value={formData.issueType} 
                    onValueChange={(v) => setFormData({...formData, issueType: v})}
                >
                    <SelectTrigger className="mt-1 bg-[#0f1419] border-gray-700 text-white">
                        <SelectValue placeholder="Select a topic" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="account">Account & Login</SelectItem>
                        <SelectItem value="billing">Billing & Subscription</SelectItem>
                        <SelectItem value="technical">Technical Issue</SelectItem>
                        <SelectItem value="fraud">Report Fraud</SelectItem>
                        <SelectItem value="forensic">Forensic Investigation</SelectItem>
                        <SelectItem value="threat_intel">Threat Intelligence</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div>
                <Label className="text-gray-300">Subject</Label>
                <Input 
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    placeholder="Brief summary of your issue"
                    className="mt-1 bg-[#0f1419] border-gray-700 text-white"
                />
            </div>

            <div>
                <Label className="text-gray-300">Description</Label>
                <Textarea 
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Please describe your issue in detail..."
                    className="mt-1 bg-[#0f1419] border-gray-700 text-white min-h-[100px]"
                />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Start Chat <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
        </form>
    </div>
  );
}