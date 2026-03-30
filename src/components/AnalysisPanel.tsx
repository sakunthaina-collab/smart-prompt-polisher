import { AlertCircle, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

interface AnalysisPanelProps {
  scores: {
    clarity: number;
    specificity: number;
    context: number;
  } | null;
  improvements: string[];
  loading?: boolean;
}

function getScoreStyle(score: number) {
  if (score >= 8) return { color: "text-success", bg: "bg-success/10", Icon: CheckCircle };
  if (score >= 5) return { color: "text-warning", bg: "bg-warning/10", Icon: AlertTriangle };
  return { color: "text-destructive", bg: "bg-destructive/10", Icon: AlertCircle };
}

export default function AnalysisPanel({ scores, improvements, loading }: AnalysisPanelProps) {
  if (loading) {
    return (
      <div className="p-4 border rounded-lg bg-primary/5 animate-pulse flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Analyzing your prompt...</p>
      </div>
    );
  }

  if (!scores) {
    return (
      <div className="p-4 border rounded-lg bg-muted">
        <p className="text-sm text-muted-foreground">Click "Analyze" to see feedback</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 space-y-4">
      <div>
        <h3 className="font-semibold text-foreground text-sm">Prompt Analysis</h3>
        <p className="text-xs text-muted-foreground mt-1">Score: 1-4 (❌), 5-7 (⚠️), 8-10 (✅)</p>
      </div>

      <div className="space-y-2">
        {Object.entries(scores).map(([key, value]) => {
          const style = getScoreStyle(value);
          return (
            <div key={key} className={`flex items-center justify-between p-2 rounded ${style.bg}`}>
              <span className="capitalize text-sm font-medium text-foreground">{key}</span>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${style.color}`}>{value}</span>
                <style.Icon className={`w-4 h-4 ${style.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {improvements.length > 0 && (
        <div className="border-t border-primary/20 pt-3">
          <h4 className="text-sm font-medium text-foreground mb-2">Top Issues</h4>
          <ul className="space-y-1">
            {improvements.slice(0, 3).map((issue, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-destructive font-bold flex-shrink-0">•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {improvements.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded p-2">
          <p className="text-xs text-primary">
            <span className="font-semibold">💡 Tip:</span>{" "}
            {improvements[0]?.toLowerCase().includes("audience")
              ? "Add target audience to improve clarity"
              : "Be more specific with your requirements"}
          </p>
        </div>
      )}
    </div>
  );
}
