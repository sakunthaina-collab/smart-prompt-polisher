import { Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-foreground/95 text-muted border-t">
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-semibold text-primary-foreground">AI Prompt Generator Pro</span>
          </div>
          <p className="text-muted-foreground">
            &copy; {new Date().getFullYear()} AI Prompt Generator. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
