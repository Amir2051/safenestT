import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Brain, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function AIRecoveryAssistant({ selectedCase }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [aiResponse, setAiResponse] = useState("");

  const handleAnalyze = async () => {
    if (!selectedCase) {
      toast.error("Please select a case first");
      return;
    }

    setAnalyzing(true);
    try {
      const prompt = `Analyze this crypto fraud case and provide recovery recommendations:
      
Case: ${selectedCase.case_title}
Fraud Type: ${selectedCase.fraud_type}
Amount Stolen: $${selectedCase.amount_stolen_usd}
Blockchain: ${selectedCase.blockchain}
Scammer Wallet: ${selectedCase.scammer_wallet}
Description: ${selectedCase.description}

Provide:
1. Recovery probability assessment
2. Recommended next steps
3. Best strategies for this fraud type
4. Timeline expectations`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recovery_probability: { type: "number" },
            risk_level: { type: "string" },
            recommended_actions: {
              type: "array",
              items: { type: "string" }
            },
            strategies: {
              type: "array",
              items: { type: "string" }
            },
            timeline: { type: "string" },
            priority_tasks: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setAnalysis(response);
      toast.success("AI analysis complete!");
    } catch (error) {
      toast.error("Analysis failed: " + error.message);
    }
    setAnalyzing(false);
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }

    setAsking(true);
    try {
      const prompt = `Context: Crypto fraud recovery case
Case: ${selectedCase.case_title}
Amount: $${selectedCase.amount_stolen_usd}
Blockchain: ${selectedCase.blockchain}

User question: ${question}

Provide a helpful, actionable answer focused on recovery strategies.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt
      });

      setAiResponse(response);
      setQuestion("");
    } catch (error) {
      toast.error("Failed to get answer: " + error.message);
    }
    setAsking(false);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-400" />
            AI Recovery Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleAnalyze}
            disabled={!selectedCase || analyzing}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Case with AI
              </>
            )}
          </Button>

          {analysis && (
            <div className="space-y-4 p-4 bg-[#0f1419] rounded-lg">
              {/* Recovery Probability */}
              <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">Recovery Probability</span>
                  <Badge className="bg-purple-500/20 text-purple-400">
                    {analysis.recovery_probability}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                    style={{ width: `${analysis.recovery_probability}%` }}
                  />
                </div>
              </div>

              {/* Risk Level */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Risk Level:</span>
                <Badge className={
                  analysis.risk_level === "high" ? "bg-red-500/20 text-red-400" :
                  analysis.risk_level === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-green-500/20 text-green-400"
                }>
                  {analysis.risk_level}
                </Badge>
              </div>

              {/* Priority Tasks */}
              <div>
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-pink-400" />
                  Priority Tasks
                </h4>
                <ul className="space-y-2">
                  {analysis.priority_tasks.map((task, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-pink-400">•</span>
                      {task}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommended Actions */}
              <div>
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  Recommended Actions
                </h4>
                <ul className="space-y-2">
                  {analysis.recommended_actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-cyan-400">→</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Strategies */}
              <div>
                <h4 className="text-white font-semibold mb-2">Recovery Strategies</h4>
                <div className="space-y-2">
                  {analysis.strategies.map((strategy, i) => (
                    <div key={i} className="p-2 bg-purple-500/5 rounded border border-purple-500/10">
                      <p className="text-sm text-gray-300">{strategy}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                <span className="text-sm text-gray-400">Expected Timeline:</span>
                <p className="text-white mt-1">{analysis.timeline}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ask AI */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">Ask Recovery Question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Ask anything about recovery strategies, legal options, or next steps..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="bg-[#0f1419] border-purple-500/20 text-white min-h-[80px]"
          />
          <Button
            onClick={handleAskQuestion}
            disabled={!selectedCase || asking || !question.trim()}
            className="w-full bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
          >
            {asking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Thinking...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Ask AI
              </>
            )}
          </Button>

          {aiResponse && (
            <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{aiResponse}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}