import React, { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateRangePickerProps {
  start: string | null;
  end: string | null;
  onChange: (range: { start: string | null; end: string | null }) => void;
  onApply: () => void;
  disabled?: boolean;
}

export function DateRangePicker({ start, end, onChange, onApply, disabled }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [localStart, setLocalStart] = useState(start || "");
  const [localEnd, setLocalEnd] = useState(end || "");

  useEffect(() => {
    setLocalStart(start || "");
    setLocalEnd(end || "");
  }, [start, end]);

  const today = new Date().toISOString().split('T')[0];

  const handleApply = () => {
    if (localStart && localEnd && localStart > localEnd) return;
    onChange({ start: localStart || null, end: localEnd || null });
    setOpen(false);
    onApply();
  };

  const handleClear = () => {
    setLocalStart("");
    setLocalEnd("");
    onChange({ start: null, end: null });
    setOpen(false);
    onApply();
  };

  const isActive = !!start || !!end;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-9 gap-2 rounded-xl border-border/50 bg-card hover:bg-accent transition-all ${isActive ? 'ring-2 ring-primary/30' : ''}`}
          disabled={disabled}
        >
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold">
            {isActive ? `${start || '...'} ~ ${end || '...'}` : 'Período Personalizado'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[260px] p-4">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Data Inicial</label>
            <input
              type="date"
              value={localStart}
              onChange={(e) => setLocalStart(e.target.value)}
              max={localEnd || today}
              className="w-full px-3 py-1.5 text-xs rounded-lg bg-muted/30 border border-border text-foreground"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Data Final</label>
            <input
              type="date"
              value={localEnd}
              onChange={(e) => setLocalEnd(e.target.value)}
              min={localStart || undefined}
              max={today}
              className="w-full px-3 py-1.5 text-xs rounded-lg bg-muted/30 border border-border text-foreground"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="flex-1 text-xs h-8" onClick={handleApply} disabled={!localStart || !localEnd}>
              Aplicar
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={handleClear}>
              Limpar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
