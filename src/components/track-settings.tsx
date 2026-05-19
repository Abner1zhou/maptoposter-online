import * as m from "@/paraglide/messages";
import { Card } from "@/components/ui/card";
import { Route, Upload, X, AlertCircle } from "lucide-react";
import { useRef, useEffect } from "react";

interface TrackSettingsProps {
  trackFileName: string;
  error: string | null;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onDismissError: () => void;
}

export function TrackSettings({ trackFileName, error, onImport, onClear, onDismissError }: TrackSettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(onDismissError, 5000);
    return () => clearTimeout(timer);
  }, [error, onDismissError]);

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center gap-2">
        <Route className="w-4 h-4 text-primary" />
        <h2 className="text-lg text-foreground">{m.gpx_track_title()}</h2>
      </div>

      <div className="space-y-3 mt-3">
        {trackFileName ? (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-secondary/30">
            <span className="text-sm text-foreground truncate">{trackFileName}</span>
            <button
              type="button"
              onClick={onClear}
              className="shrink-0 p-1 rounded hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <Upload className="w-4 h-4" />
            {m.gpx_import_file()}
          </button>
        )}

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={onDismissError}
              className="shrink-0 p-0.5 rounded hover:bg-destructive/20 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".gpx"
          onChange={onImport}
          className="hidden"
        />
      </div>
    </Card>
  );
}
