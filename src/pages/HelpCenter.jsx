import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle, MessageSquare, FileText, Shield, AlertCircle, CheckCircle, Clock,
  Send, Loader2, ExternalLink, BookOpen, Mail, Phone, Search
} from "lucide-react";
import { toast } from "sonner";

export default function HelpCenter() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    category: "general_question",
    message: "",
    related_case_id: ""
  });
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch user's tickets
  const { data: tickets = [], isLoading: loadingTickets } = useQuery({
    queryKey: ['support-tickets', user?.email],
    queryFn: () => base44.entities.SupportTicket.filter({ user_email: user.email }, '-created_date', 100),
    enabled: !!user
  });

  // Submit ticket mutation
  const submitTicketMutation = useMutation({
    mutationFn: async (ticketData) => {
      return base44.entities.SupportTicket.create({
        ...ticketData,
        user_email: user.email,
        user_name: user.full_name || user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      setTicketForm({ subject: "", category: "general_question", message: "", related_case_id: "" });
      toast.success("Support ticket submitted successfully! We'll respond within 24-48 hours.");
    },
    onError: (error) => {
      toast.error("Failed to submit ticket: " + error.message);
    }
  });

  const handleSubmitTicket = (e) => {
    e.preventDefault();
    if (!ticketForm.subject || !ticketForm.message) {
      toast.error("Please fill in all required fields");
      return;
    }
    submitTicketMutation.mutate(ticketForm);
  };

  const faqs = [
    {
      category: "Getting Started",
      questions: [
        {
          q: "What is SafeNestT?",
          a: "SafeNestT is a comprehensive cyber fraud protection and recovery platform. We help victims of digital fraud document their cases, trace stolen assets, and coordinate with law enforcement for recovery efforts."
        },
        {
          q: "How do I report an incident?",
          a: "Navigate to 'Report Incident' in the sidebar menu. Fill out the detailed form with information about yourself, the incident, and the alleged perpetrator. Upload any supporting evidence such as screenshots, transaction records, or communications."
        },
        {
          q: "Is my information secure?",
          a: "Yes. All data is encrypted end-to-end and stored on secure servers. We comply with GDPR and data protection regulations. Only authorized personnel have access to your case information."
        }
      ]
    },
    {
      category: "Reporting Procedures",
      questions: [
        {
          q: "What information should I include in my report?",
          a: "Include as much detail as possible: dates, amounts, transaction IDs, wallet addresses (for crypto), email addresses, phone numbers, websites, and any communication records with the alleged perpetrator. The more information you provide, the better we can assist."
        },
        {
          q: "Can I update my report after submission?",
          a: "Yes! Go to 'My Cases' to view and update your submitted reports. You can add new evidence, update contact information, or provide additional details at any time."
        },
        {
          q: "How long does it take to process my report?",
          a: "Initial review typically takes 24-48 hours. Complex cases may take longer. You'll receive status updates via email and can track progress in the 'My Cases' section."
        },
        {
          q: "Should I also file an IC3 report?",
          a: "Yes! We strongly recommend filing an official report with the FBI's Internet Crime Complaint Center (IC3) at ic3.gov. SafeNestT's reports supplement official law enforcement reporting but do not replace it."
        }
      ]
    },
    {
      category: "Legal & Disclaimers",
      questions: [
        {
          q: "Is SafeNestT a law enforcement agency?",
          a: "No. SafeNestT is a private platform that assists victims in documenting and reporting cyber fraud. We work alongside law enforcement but are not a government agency. Always file official reports with appropriate authorities."
        },
        {
          q: "Can SafeNestT guarantee fund recovery?",
          a: "No. While we provide advanced tracking and documentation services, we cannot guarantee recovery of stolen funds. Success depends on many factors including jurisdictional cooperation, blockchain traceability, and timing."
        },
        {
          q: "What are your legal disclaimers?",
          a: "SafeNestT provides informational and documentation services only. We are not providing legal advice, financial advice, or guarantees of any outcome. All information is user-reported and unverified. Users should consult with appropriate legal and financial professionals for their specific situations."
        },
        {
          q: "Do you share information with law enforcement?",
          a: "Only with explicit user authorization. When you submit a case, you can opt-in to authorize SafeNestT to share your information with appropriate law enforcement agencies. Without authorization, your data remains private."
        }
      ]
    },
    {
      category: "Case Management",
      questions: [
        {
          q: "How do I check my case status?",
          a: "Visit the 'My Cases' page to see all your submitted reports, their current status, and any updates from our team."
        },
        {
          q: "Can I communicate with the support team about my case?",
          a: "Yes! Each case has a secure messaging feature. You can also submit a support ticket here in the Help Center referencing your case ID."
        },
        {
          q: "What do the different case statuses mean?",
          a: "Pending: Awaiting initial review | In Review: Being evaluated by our team | In Progress: Active investigation/documentation | Resolved: Case completed or funds recovered | Closed: No further action possible"
        }
      ]
    },
    {
      category: "Technical Support",
      questions: [
        {
          q: "I'm having trouble uploading files. What should I do?",
          a: "Ensure files are under 10MB each and in supported formats (PDF, JPG, PNG, CSV). Try clearing your browser cache or using a different browser. If issues persist, submit a support ticket."
        },
        {
          q: "Can I access SafeNestT on mobile devices?",
          a: "Yes! Our platform is fully responsive and works on all modern browsers and devices."
        },
        {
          q: "I forgot my password. How do I reset it?",
          a: "Click 'Forgot Password' on the login page. You'll receive a password reset link via email."
        }
      ]
    }
  ];

  const filteredFAQs = searchQuery
    ? faqs.map(cat => ({
        ...cat,
        questions: cat.questions.filter(
          q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
               q.a.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(cat => cat.questions.length > 0)
    : faqs;

  const statusConfig = {
    open: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: Clock },
    in_progress: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/50', icon: Loader2 },
    waiting_for_user: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/50', icon: AlertCircle },
    resolved: { color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: CheckCircle },
    closed: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/50', icon: FileText }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-cyan-400" />
            Help Center
          </h1>
          <p className="text-gray-400 mt-1">Find answers, submit support tickets, and learn more about SafeNestT</p>
        </div>
      </div>

      <Tabs defaultValue="faq" className="space-y-6">
        <TabsList className="bg-[#1a2332] border border-cyan-500/20">
          <TabsTrigger value="faq" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            <BookOpen className="w-4 h-4 mr-2" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="contact" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            <MessageSquare className="w-4 h-4 mr-2" />
            Contact Support
          </TabsTrigger>
          <TabsTrigger value="tickets" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            <FileText className="w-4 h-4 mr-2" />
            My Tickets {tickets.length > 0 && `(${tickets.length})`}
          </TabsTrigger>
        </TabsList>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="space-y-6">
          {/* Search */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search frequently asked questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 bg-[#0f1419] border-cyan-500/30 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border-cyan-500/30 hover:border-cyan-500/50 transition-colors cursor-pointer">
              <CardContent className="p-6 text-center">
                <ExternalLink className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">FBI IC3 Reporting</h3>
                <p className="text-gray-400 text-sm mb-3">File an official Internet Crime Complaint</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-cyan-500/30 text-cyan-400"
                  onClick={() => window.open('https://www.ic3.gov/Home/FileComplaint', '_blank')}
                >
                  Visit IC3.gov
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 hover:border-purple-500/50 transition-colors">
              <CardContent className="p-6 text-center">
                <Shield className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">Safety Resources</h3>
                <p className="text-gray-400 text-sm mb-3">Learn how to protect yourself online</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-500/30 text-purple-400"
                >
                  View Resources
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-cyan-500/10 border-green-500/30 hover:border-green-500/50 transition-colors">
              <CardContent className="p-6 text-center">
                <MessageSquare className="w-8 h-8 text-green-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">Live Chat</h3>
                <p className="text-gray-400 text-sm mb-3">Chat with our AI assistant Mia</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-green-500/30 text-green-400"
                >
                  Start Chat
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Accordion */}
          {filteredFAQs.map((category, idx) => (
            <Card key={idx} className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-white text-lg">{category.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="space-y-2">
                  {category.questions.map((faq, qIdx) => (
                    <AccordionItem
                      key={qIdx}
                      value={`${idx}-${qIdx}`}
                      className="border border-cyan-500/10 rounded-lg px-4 bg-[#0f1419]"
                    >
                      <AccordionTrigger className="text-white hover:text-cyan-400 text-left">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-300 leading-relaxed">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}

          {filteredFAQs.length === 0 && searchQuery && (
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardContent className="p-12 text-center">
                <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-white font-semibold text-lg mb-2">No results found</p>
                <p className="text-gray-400">Try different keywords or submit a support ticket</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Contact Support Tab */}
        <TabsContent value="contact" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contact Info */}
            <div className="space-y-4">
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Contact Information</CardTitle>
                  <CardDescription className="text-gray-400">Get in touch with our team</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 text-gray-300">
                    <Mail className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="text-xs text-gray-400">Email Support</p>
                      <p className="font-mono text-sm">support@safenestt.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <Phone className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="text-xs text-gray-400">Phone Support</p>
                      <p className="font-mono text-sm">1-800-SAFE-NST</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <Clock className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="text-xs text-gray-400">Support Hours</p>
                      <p className="text-sm">24/7 Emergency Support</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-orange-400 font-semibold text-sm mb-1">Response Times</p>
                      <p className="text-gray-300 text-xs">
                        Critical issues: 2-4 hours<br/>
                        General inquiries: 24-48 hours<br/>
                        Account questions: 12-24 hours
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Support Form */}
            <div className="lg:col-span-2">
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Submit a Support Ticket</CardTitle>
                  <CardDescription className="text-gray-400">
                    Fill out the form below and we'll get back to you as soon as possible
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitTicket} className="space-y-4">
                    <div>
                      <Label className="text-gray-300">Subject *</Label>
                      <Input
                        placeholder="Brief description of your issue"
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm({...ticketForm, subject: e.target.value})}
                        className="bg-[#0f1419] border-cyan-500/30 text-white"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">Category *</Label>
                      <Select
                        value={ticketForm.category}
                        onValueChange={(v) => setTicketForm({...ticketForm, category: v})}
                      >
                        <SelectTrigger className="bg-[#0f1419] border-cyan-500/30 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="report_question">Question About My Report</SelectItem>
                          <SelectItem value="technical_issue">Technical Issue</SelectItem>
                          <SelectItem value="account_help">Account Help</SelectItem>
                          <SelectItem value="legal_inquiry">Legal Inquiry</SelectItem>
                          <SelectItem value="case_update">Case Status Update</SelectItem>
                          <SelectItem value="general_question">General Question</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-300">Related Case ID (Optional)</Label>
                      <Input
                        placeholder="If this is about a specific case, enter its ID"
                        value={ticketForm.related_case_id}
                        onChange={(e) => setTicketForm({...ticketForm, related_case_id: e.target.value})}
                        className="bg-[#0f1419] border-cyan-500/30 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">Message *</Label>
                      <Textarea
                        placeholder="Provide as much detail as possible about your question or issue..."
                        value={ticketForm.message}
                        onChange={(e) => setTicketForm({...ticketForm, message: e.target.value})}
                        className="bg-[#0f1419] border-cyan-500/30 text-white min-h-[150px]"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700"
                      disabled={submitTicketMutation.isPending}
                    >
                      {submitTicketMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Submit Ticket
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* My Tickets Tab */}
        <TabsContent value="tickets" className="space-y-6">
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white">Your Support Tickets</CardTitle>
              <CardDescription className="text-gray-400">
                Track the status of your support requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTickets ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">Loading your tickets...</p>
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-white font-semibold mb-2">No support tickets yet</p>
                  <p className="text-gray-400 text-sm">Submit a ticket to get help from our team</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tickets.map((ticket) => {
                    const status = statusConfig[ticket.status] || statusConfig.open;
                    const StatusIcon = status.icon;
                    
                    return (
                      <div
                        key={ticket.id}
                        className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <h3 className="text-white font-semibold mb-1">{ticket.subject}</h3>
                            <p className="text-gray-400 text-sm">
                              {ticket.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </p>
                          </div>
                          <Badge className={`${status.color} border`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {ticket.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        </div>
                        <p className="text-gray-300 text-sm mb-3 line-clamp-2">{ticket.message}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Submitted: {new Date(ticket.created_date).toLocaleDateString()}</span>
                          {ticket.responses && ticket.responses.length > 0 && (
                            <span className="text-cyan-400">{ticket.responses.length} responses</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}