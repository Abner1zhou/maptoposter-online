import { Card } from "@/components/ui/card";
import { MapPin, LocateFixed } from "lucide-react";
import * as m from "@/paraglide/messages";

interface MyLocationSettingsProps {
  enabled: boolean;
  lat: string;
  lng: string;
  onEnabledChange: (val: boolean) => void;
  onLatChange: (val: string) => void;
  onLngChange: (val: string) => void;
}

export function MyLocationSettings({
  enabled,
  lat,
  lng,
  onEnabledChange,
  onLatChange,
  onLngChange,
}: MyLocationSettingsProps) {
  const handleUseGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLatChange(pos.coords.latitude.toFixed(6));
        onLngChange(pos.coords.longitude.toFixed(6));
        if (!enabled) onEnabledChange(true);
      },
      () => {
        alert(m.my_location_gps_error());
      },
    );
  };

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        <h2 className="text-lg text-foreground">{m.my_location_title()}</h2>
      </div>

      <div className="space-y-3 mt-3">
        <label className="flex items-center gap-3 cursor-pointer py-1 px-1 hover:bg-secondary/30 rounded transition-colors">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
          />
          <span className="text-sm text-foreground select-none">{m.my_location_enable()}</span>
        </label>

        {enabled && (
          <>
            <button
              type="button"
              onClick={handleUseGps}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <LocateFixed className="w-4 h-4" />
              {m.my_location_use_gps()}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{m.my_location_lat()}</label>
                <input
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  value={lat}
                  onChange={(e) => onLatChange(e.target.value)}
                  placeholder="48.856600"
                  className="w-full h-8 px-2 text-sm rounded border border-border bg-card text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{m.my_location_lng()}</label>
                <input
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  value={lng}
                  onChange={(e) => onLngChange(e.target.value)}
                  placeholder="2.352200"
                  className="w-full h-8 px-2 text-sm rounded border border-border bg-card text-foreground"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
