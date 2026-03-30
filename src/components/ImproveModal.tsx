import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, RotateCcw, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ImproveModalProps {
  open: boolean;
  original: string;
  improved: string;
  loading?: boolean;
  onAccept: (improved: string) => void;
  onRegenerate: () => void;
  onClose: () => void;
}

export default function ImproveModal({
  open,
  original,
  improved,
  loading,
  onAccept,
  onRegenerate,
  onClose,
}: ImproveModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(improved);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleAccept = () => {
    onAccept(improved);
    onClose();
    toast.success("Prompt updated!");
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Improving your prompt...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Improve Prompt</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">Original</h4>
            <Textarea
              value={original}
              readOnly
              className="h-40 bg-muted text-muted-foreground resize-none"
            />
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">Improved</h4>
            <Textarea
              value={improved}
              readOnly
              className="h-40 bg-success/10 text-foreground resize-none border-success/30"
            />
          </div>
        </div>

        {improved && original && improved !== original && (
          <div className="bg-primary/5 border border-primary/20 rounded p-3">
            <p className="text-sm text-foreground">
              <span className="font-semibold">✨ Key improvements:</span>
              <br />• More specific and actionable
              <br />• Better context and clarity
              <br />• Framework-structured format
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={handleCopy} className="gap-2">
            {copied ? <><Check className="w-4 h-4" />Copied</> : <><Copy className="w-4 h-4" />Copy</>}
          </Button>
          <Button variant="outline" onClick={onRegenerate} className="gap-2">
            <RotateCcw className="w-4 h-4" />Regenerate
          </Button>
          <Button onClick={handleAccept} className="gap-2">
            Accept & Use
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
