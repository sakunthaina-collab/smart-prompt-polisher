import { Badge } from "@/components/ui/badge";
import { type PromptScore } from "@/lib/promptScorer";

interface ComparePanelProps {
  original: string;
  improved: string;
  originalScore: PromptScore;
  improvedScore: PromptScore;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 70 ? "bg-success" : value >= 40 ? "bg-warning" : "bg-destructive";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function highlightDifferences(original: string, improved: string): React.ReactNode {
  const origWords = original.split(/\s+/);
  const origSet = new Set(origWords.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, "")));

  return improved.split(/(\s+)/).map((word, i) => {
    const clean = word.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (clean && !origSet.has(clean)) {
      return (
        <span key={i} className="font-bold text-primary">
          {word}
        </span>
      );
    }
    return <span key={i}>{word}</span>;
  });
}

export default function ComparePanel({
  original,
  improved,
  originalScore,
  improvedScore,
}: ComparePanelProps) {
  const improvement = improvedScore.total - originalScore.total;

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Compare Mode</h3>
        <Badge
          variant={improvement > 0 ? "default" : "secondary"}
          className={improvement > 0 ? "bg-success text-success-foreground" : ""}
        >
          {improvement > 0 ? `+${improvement}` : improvement} points
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">Original Prompt</h4>
          <div className="p-3 rounded-lg bg-muted text-sm text-foreground whitespace-pre-wrap min-h-[100px]">
            {original}
          </div>
          <div className="space-y-2">
            <ScoreBar label="Clarity" value={originalScore.clarity} />
            <ScoreBar label="Specificity" value={originalScore.specificity} />
            <ScoreBar label="Effectiveness" value={originalScore.effectiveness} />
            <div className="flex justify-between text-sm font-bold pt-1 border-t">
              <span className="text-foreground">Total</span>
              <span className="text-foreground">{originalScore.total}</span>
            </div>
          </div>
        </div>

        {/* Improved */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-primary">Improved Prompt</h4>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-foreground whitespace-pre-wrap min-h-[100px]">
            {highlightDifferences(original, improved)}
          </div>
          <div className="space-y-2">
            <ScoreBar label="Clarity" value={improvedScore.clarity} />
            <ScoreBar label="Specificity" value={improvedScore.specificity} />
            <ScoreBar label="Effectiveness" value={improvedScore.effectiveness} />
            <div className="flex justify-between text-sm font-bold pt-1 border-t">
              <span className="text-foreground">Total</span>
              <span className="text-primary">{improvedScore.total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Improvement summary */}
      <div className="text-center text-sm text-muted-foreground pt-2 border-t">
        Original: <span className="font-bold text-foreground">{originalScore.total}</span>
        {" → "}
        Improved: <span className="font-bold text-primary">{improvedScore.total}</span>
        {" | "}
        Improvement: <span className={`font-bold ${improvement > 0 ? "text-success" : "text-destructive"}`}>
          {improvement > 0 ? `+${improvement}` : improvement}
        </span>
      </div>
    </div>
  );
}
