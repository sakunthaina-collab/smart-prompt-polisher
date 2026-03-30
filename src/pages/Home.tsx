import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, Trash2, Download, Sparkles, ArrowRight, Zap, Search, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import AnalysisPanel from "@/components/AnalysisPanel";
import ImproveModal from "@/components/ImproveModal";
import { detectIntent, type IntentResult } from "@/lib/intentDetector";
import type { AnalysisResult } from "@/lib/promptAnalyzer";
import { supabase } from "@/integrations/supabase/client";

const QUICK_SUGGESTIONS = [
  "Write a thank you email",
  "Draft technical documentation",
  "Create presentation outline",
  "Write user requirements",
  "Write customer support response",
  "Write marketing copy",
  "Generate meeting agenda",
  "Create content calendar",
];

const FRAMEWORKS = [
  { value: "Standard", label: "Standard Prompt – General use" },
  { value: "Reasoning", label: "Reasoning – Complex problem solving" },
  { value: "RACE", label: "RACE – Role, Action, Context, Explanation" },
  { value: "CARE", label: "CARE – Context, Action, Result, Example" },
  { value: "APE", label: "APE – Action, Purpose, Execution" },
];

interface HistoryItem {
  id: number;
  userInput: string;
  generatedPrompt: string;
  framework: string;
  createdAt: string;
}

export default function Home() {
  const [userInput, setUserInput] = useState("");
  const [framework, setFramework] = useState("Standard");
  const [activeTab, setActiveTab] = useState<"generate" | "history">("generate");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("prompt-history") || "[]");
    } catch { return []; }
  });

  // Smart features state
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [intentResult, setIntentResult] = useState<IntentResult | null>(null);
  const [showImproveModal, setShowImproveModal] = useState(false);
  const [improvedPromptText, setImprovedPromptText] = useState("");
  const [isImproving, setIsImproving] = useState(false);

  // Auto-detect intent when input changes
  useEffect(() => {
    if (userInput.length > 10) {
      const result = detectIntent(userInput);
      setIntentResult(result);
      setFramework(result.framework);
    } else {
      setIntentResult(null);
    }
  }, [userInput]);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem("prompt-history", JSON.stringify(history));
  }, [history]);

  const handleGenerate = useCallback(() => {
    if (!userInput.trim()) {
      toast.error("Please enter a prompt description");
      return;
    }
    setIsGenerating(true);

    // Simulate generation with improvement logic
    setTimeout(() => {
      const result = improvePrompt(userInput, framework);
      setGeneratedPrompt(result);
      const newItem: HistoryItem = {
        id: Date.now(),
        userInput,
        generatedPrompt: result,
        framework,
        createdAt: new Date().toISOString(),
      };
      setHistory(prev => [newItem, ...prev]);
      setIsGenerating(false);
      toast.success("Prompt generated successfully!");
    }, 800);
  }, [userInput, framework]);

  const handleAnalyze = useCallback(() => {
    if (!userInput.trim()) return;
    const result = analyzePrompt(userInput);
    setAnalysisResult(result);
    setShowAnalyzer(true);
    toast.success("Prompt analyzed!");
  }, [userInput]);

  const handleImprove = useCallback(() => {
    setIsImproving(true);
    setShowImproveModal(true);
    setTimeout(() => {
      const result = improvePrompt(userInput, framework);
      setImprovedPromptText(result);
      setIsImproving(false);
    }, 600);
  }, [userInput, framework]);

  const handleAcceptImproved = useCallback((text: string) => {
    setUserInput(text);
    setShowImproveModal(false);
    setShowAnalyzer(false);
    setAnalysisResult(null);
  }, []);

  const handleRegenerate = useCallback(() => {
    setIsImproving(true);
    setTimeout(() => {
      const result = improvePrompt(userInput + " " + Math.random().toString(36).slice(2, 5), framework);
      setImprovedPromptText(result);
      setIsImproving(false);
    }, 600);
  }, [userInput, framework]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  }, []);

  const handleDelete = useCallback((id: number) => {
    setHistory(prev => prev.filter(item => item.id !== id));
    toast.success("Prompt deleted");
  }, []);

  const handleExport = useCallback((format: "txt" | "csv") => {
    if (history.length === 0) { toast.error("No prompts to export"); return; }
    let content: string;
    let filename: string;
    if (format === "csv") {
      content = "Framework,Input,Generated\n" + history.map(h =>
        `"${h.framework}","${h.userInput.replace(/"/g, '""')}","${h.generatedPrompt.replace(/"/g, '""')}"`
      ).join("\n");
      filename = "prompts.csv";
    } else {
      content = history.map(h => `[${h.framework}]\nInput: ${h.userInput}\nGenerated: ${h.generatedPrompt}\n`).join("\n---\n\n");
      filename = "prompts.txt";
    }
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported as ${format.toUpperCase()}`);
  }, [history]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="bg-card shadow-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">AI Prompt Generator Pro</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2">
            <Card className="p-6 shadow-lg">
              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b">
                <button
                  onClick={() => setActiveTab("generate")}
                  className={`pb-3 px-4 font-medium transition-all ${
                    activeTab === "generate"
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Generate Prompt
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`pb-3 px-4 font-medium transition-all ${
                    activeTab === "history"
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  History ({history.length})
                </button>
              </div>

              {activeTab === "generate" ? (
                <div className="space-y-6">
                  {/* Input */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      What do you want to create?
                    </label>
                    <Textarea
                      placeholder="I want a prompt that will..."
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      className="min-h-32 resize-none transition-all focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-2">{userInput.length}/500 characters</p>
                  </div>

                  {/* Intent Display + Smart Buttons */}
                  {userInput.length > 10 && (
                    <div className="space-y-3">
                      {/* Intent Detection Display */}
                      {intentResult && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                            Detected: {intentResult.intent}
                          </Badge>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <Badge variant="secondary">
                            {intentResult.framework}
                          </Badge>
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={handleAnalyze} className="gap-2">
                          <Search className="w-4 h-4" />
                          Analyze
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleImprove} className="gap-2">
                          <Sparkles className="w-4 h-4" />
                          Improve
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Analysis Panel */}
                  {showAnalyzer && (
                    <AnalysisPanel
                      scores={analysisResult?.scores || null}
                      improvements={analysisResult?.improvements || []}
                    />
                  )}

                  {/* Framework Selector */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Select Framework
                    </label>
                    <Select value={framework} onValueChange={setFramework}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FRAMEWORKS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !userInput.trim()}
                    className="w-full py-6 text-lg font-semibold transition-all hover:shadow-lg active:scale-[0.98]"
                  >
                    {isGenerating ? "Generating..." : (
                      <><Sparkles className="w-5 h-5 mr-2" />Generate Prompt</>
                    )}
                  </Button>

                  {/* Generated Output */}
                  {generatedPrompt && (
                    <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                      <h3 className="font-semibold text-foreground mb-3">Generated Prompt</h3>
                      <p className="text-sm text-foreground whitespace-pre-wrap mb-4 leading-relaxed">
                        {generatedPrompt}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleCopy(generatedPrompt)}>
                          <Copy className="w-4 h-4 mr-2" />Copy
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleExport("txt")}>
                          <Download className="w-4 h-4 mr-2" />Export TXT
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Quick Suggestions */}
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">Quick Suggestions</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {QUICK_SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => setUserInput(s)}
                          className="text-left p-3 bg-muted hover:bg-primary/10 border rounded-lg text-sm text-foreground transition-all hover:shadow-md"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* History Tab */
                <div className="space-y-4">
                  {history.length > 0 ? (
                    <>
                      <div className="flex gap-2 mb-4">
                        <Button size="sm" variant="outline" onClick={() => handleExport("txt")}>Export TXT</Button>
                        <Button size="sm" variant="outline" onClick={() => handleExport("csv")}>Export CSV</Button>
                      </div>
                      {history.map((item) => (
                        <div key={item.id} className="p-4 bg-muted rounded-lg border hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline">{item.framework}</Badge>
                            <button onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 font-medium">{item.userInput}</p>
                          <p className="text-sm text-foreground mb-3 line-clamp-3">{item.generatedPrompt}</p>
                          <Button size="sm" variant="outline" onClick={() => handleCopy(item.generatedPrompt)}>
                            <Copy className="w-4 h-4 mr-2" />Copy
                          </Button>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No prompts generated yet</p>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column - Stats */}
          <div>
            <Card className="p-6 shadow-lg sticky top-24">
              <h3 className="text-lg font-semibold text-foreground mb-4">Usage Stats</h3>
              <div className="space-y-4">
                <div className="bg-primary/10 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Total Prompts</p>
                  <p className="text-3xl font-bold text-primary">{history.length}</p>
                </div>
                <div className="bg-accent/10 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Frameworks Used</p>
                  <p className="text-3xl font-bold text-accent">
                    {new Set(history.map(h => h.framework)).size}
                  </p>
                </div>
                <div className="bg-success/10 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Most Used</p>
                  <p className="text-lg font-bold text-success">
                    {history.length > 0
                      ? Object.entries(
                          history.reduce((acc, h) => { acc[h.framework] = (acc[h.framework] || 0) + 1; return acc; }, {} as Record<string, number>)
                        ).sort((a, b) => b[1] - a[1])[0]?.[0] || "—"
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Framework Guide */}
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-semibold text-foreground mb-3">Framework Guide</h4>
                <div className="space-y-2 text-xs text-muted-foreground">
                  {FRAMEWORKS.map(f => (
                    <div key={f.value} className="flex gap-2">
                      <Badge variant="outline" className="text-[10px] flex-shrink-0">{f.value}</Badge>
                      <span>{f.label.split(" – ")[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Footer />

      {/* Improve Modal */}
      <ImproveModal
        open={showImproveModal}
        original={userInput}
        improved={improvedPromptText}
        loading={isImproving}
        onAccept={handleAcceptImproved}
        onRegenerate={handleRegenerate}
        onClose={() => setShowImproveModal(false)}
      />
    </div>
  );
}
