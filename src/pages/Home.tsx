import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, Trash2, Download, Sparkles, ArrowRight, Zap, Search, Loader2, RotateCcw, Minimize2, MessageSquare } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import AnalysisPanel from "@/components/AnalysisPanel";
import ImproveModal from "@/components/ImproveModal";
import ComparePanel from "@/components/ComparePanel";
import { detectIntent, type IntentResult } from "@/lib/intentDetector";
import type { AnalysisResult } from "@/lib/promptAnalyzer";
import { scorePrompt, type PromptScore } from "@/lib/promptScorer";
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
  improvedPrompt?: string;
  framework: string;
  createdAt: string;
}

export default function Home() {
  const [userInput, setUserInput] = useState("");
  const [framework, setFramework] = useState("Standard");
  const [activeTab, setActiveTab] = useState<"generate" | "history">("generate");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputError, setInputError] = useState("");
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

  // Compare mode state
  const [showCompare, setShowCompare] = useState(false);
  const [compareOriginal, setCompareOriginal] = useState("");
  const [compareImproved, setCompareImproved] = useState("");

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

  // Clear input error when user types
  useEffect(() => {
    if (userInput.trim()) setInputError("");
  }, [userInput]);

  const handleGenerate = useCallback(async () => {
    if (!userInput.trim()) {
      setInputError("Please enter a prompt");
      toast.error("Please enter a prompt");
      return;
    }
    setInputError("");
    setIsGenerating(true);
    setGeneratedPrompt("");
    setShowCompare(false);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-prompt`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ userInput, framework }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullText += content;
              setGeneratedPrompt(fullText);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (fullText) {
        const newItem: HistoryItem = {
          id: Date.now(),
          userInput,
          generatedPrompt: fullText,
          framework,
          createdAt: new Date().toISOString(),
        };
        setHistory(prev => [newItem, ...prev]);
        toast.success("Prompt generated!");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate prompt");
    } finally {
      setIsGenerating(false);
    }
  }, [userInput, framework]);

  const handleAnalyze = useCallback(async () => {
    if (!userInput.trim()) {
      setInputError("Please enter a prompt");
      return;
    }
    setShowAnalyzer(true);
    setAnalysisResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-prompt", {
        body: { prompt: userInput },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysisResult(data as AnalysisResult);
      toast.success("Prompt analyzed!");
    } catch (error: any) {
      toast.error(error?.message || "Failed to analyze prompt");
      setShowAnalyzer(false);
    }
  }, [userInput]);

  const handleImprove = useCallback(async () => {
    if (!userInput.trim()) {
      setInputError("Please enter a prompt");
      return;
    }
    setIsImproving(true);
    setShowImproveModal(true);
    setImprovedPromptText("");
    try {
      const { data, error } = await supabase.functions.invoke("improve-prompt", {
        body: { prompt: userInput, framework },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setImprovedPromptText(data.improvedPrompt);
    } catch (error: any) {
      toast.error(error?.message || "Failed to improve prompt");
      setShowImproveModal(false);
    } finally {
      setIsImproving(false);
    }
  }, [userInput, framework]);

  const handleAcceptImproved = useCallback((text: string) => {
    // Show compare mode
    setCompareOriginal(userInput);
    setCompareImproved(text);
    setShowCompare(true);

    // Update history: add improved prompt to latest matching item
    setHistory(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(h => h.userInput === userInput);
      if (idx !== -1) {
        updated[idx] = { ...updated[idx], improvedPrompt: text };
      }
      return updated;
    });

    setUserInput(text);
    setShowImproveModal(false);
    setShowAnalyzer(false);
    setAnalysisResult(null);
  }, [userInput]);

  const handleRegenerate = useCallback(async () => {
    setIsImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke("improve-prompt", {
        body: { prompt: userInput, framework },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setImprovedPromptText(data.improvedPrompt);
    } catch (error: any) {
      toast.error(error?.message || "Failed to regenerate");
    } finally {
      setIsImproving(false);
    }
  }, [userInput, framework]);

  // Quick Actions
  const handleQuickAction = useCallback(async (action: "improve" | "shorten" | "persuasive") => {
    const targetText = generatedPrompt || userInput;
    if (!targetText.trim()) {
      setInputError("Please enter a prompt");
      toast.error("Please enter a prompt");
      return;
    }

    setIsImproving(true);
    setShowImproveModal(true);
    setImprovedPromptText("");

    const instructions: Record<string, string> = {
      improve: "Improve this prompt to be clearer, more specific, and more effective.",
      shorten: "Make this prompt shorter and more concise while keeping the core intent. Remove unnecessary words.",
      persuasive: "Rewrite this prompt to be more persuasive, compelling, and action-oriented. Use stronger language.",
    };

    try {
      const { data, error } = await supabase.functions.invoke("improve-prompt", {
        body: {
          prompt: `${instructions[action]}\n\nOriginal prompt:\n"${targetText}"`,
          framework,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setImprovedPromptText(data.improvedPrompt);
    } catch (error: any) {
      toast.error(error?.message || "Failed to process");
      setShowImproveModal(false);
    } finally {
      setIsImproving(false);
    }
  }, [generatedPrompt, userInput, framework]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  }, []);

  const handleDelete = useCallback((id: number) => {
    setHistory(prev => prev.filter(item => item.id !== id));
    toast.success("Prompt deleted");
  }, []);

  const handleLoadFromHistory = useCallback((item: HistoryItem) => {
    setUserInput(item.userInput);
    setGeneratedPrompt(item.generatedPrompt);
    if (item.improvedPrompt) {
      setCompareOriginal(item.userInput);
      setCompareImproved(item.improvedPrompt);
      setShowCompare(true);
    } else {
      setShowCompare(false);
    }
    setActiveTab("generate");
    toast.success("Prompt loaded from history");
  }, []);

  const handleExport = useCallback((format: "txt" | "csv") => {
    if (history.length === 0) { toast.error("No prompts to export"); return; }
    let content: string;
    let filename: string;
    if (format === "csv") {
      content = "Framework,Input,Generated,Improved\n" + history.map(h =>
        `"${h.framework}","${h.userInput.replace(/"/g, '""')}","${h.generatedPrompt.replace(/"/g, '""')}","${(h.improvedPrompt || "").replace(/"/g, '""')}"`
      ).join("\n");
      filename = "prompts.csv";
    } else {
      content = history.map(h =>
        `[${h.framework}]\nInput: ${h.userInput}\nGenerated: ${h.generatedPrompt}${h.improvedPrompt ? `\nImproved: ${h.improvedPrompt}` : ""}\n`
      ).join("\n---\n\n");
      filename = "prompts.txt";
    }
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported as ${format.toUpperCase()}`);
  }, [history]);

  // Compute scores for compare mode
  const originalScore = showCompare ? scorePrompt(compareOriginal) : null;
  const improvedScore = showCompare ? scorePrompt(compareImproved) : null;

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
                      className={`min-h-32 resize-none transition-all focus:ring-2 focus:ring-primary ${
                        inputError ? "border-destructive ring-destructive" : ""
                      }`}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-muted-foreground">{userInput.length}/500 characters</p>
                      {inputError && (
                        <p className="text-xs text-destructive font-medium">{inputError}</p>
                      )}
                    </div>
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
                      loading={showAnalyzer && !analysisResult}
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
                    {isGenerating ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating...</>
                    ) : (
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

                      {/* Quick Actions */}
                      <div className="mt-4 pt-3 border-t border-success/20">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Quick Actions</p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickAction("improve")}
                            className="gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Improve Again
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickAction("shorten")}
                            className="gap-1"
                          >
                            <Minimize2 className="w-3 h-3" />
                            Make Shorter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickAction("persuasive")}
                            className="gap-1"
                          >
                            <MessageSquare className="w-3 h-3" />
                            Make More Persuasive
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Compare Mode */}
                  {showCompare && originalScore && improvedScore && (
                    <ComparePanel
                      original={compareOriginal}
                      improved={compareImproved}
                      originalScore={originalScore}
                      improvedScore={improvedScore}
                    />
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
                        <div
                          key={item.id}
                          className="p-4 bg-muted rounded-lg border hover:shadow-md transition-all cursor-pointer"
                          onClick={() => handleLoadFromHistory(item)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline">{item.framework}</Badge>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1 font-medium">
                            Original: {item.userInput}
                          </p>
                          <p className="text-sm text-foreground mb-1 line-clamp-2">
                            Generated: {item.generatedPrompt}
                          </p>
                          {item.improvedPrompt && (
                            <p className="text-sm text-primary line-clamp-2">
                              Improved: {item.improvedPrompt}
                            </p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); handleCopy(item.generatedPrompt); }}
                            >
                              <Copy className="w-4 h-4 mr-1" />Copy
                            </Button>
                          </div>
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
