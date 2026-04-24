import React, { useState, useEffect } from "react";
import { Input } from "./input";
import { Label } from "./label";
import { cn } from "@/lib/utils";

interface PhoneInputBRProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  onPhoneChange?: (value: string) => void;
}

export const PhoneInputBR = React.forwardRef<HTMLInputElement, PhoneInputBRProps>(
  ({ className, label, error, value, onChange, onPhoneChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState("");

    // Initial value formatting
    useEffect(() => {
      if (value) {
        setDisplayValue(maskPhone(String(value)));
      }
    }, [value]);

    const maskPhone = (v: string) => {
      v = v.replace(/\D/g, ""); // Remove non-digits
      if (v.length > 11) v = v.slice(0, 11); // Max 11 digits
      
      if (v.length <= 10) {
        // (00) 0000-0000
        v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
        v = v.replace(/(\d{4})(\d)/, "$1-$2");
      } else {
        // (00) 00000-0000
        v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
        v = v.replace(/(\d{5})(\d)/, "$1-$2");
      }
      return v;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const masked = maskPhone(rawValue);
      const plain = masked.replace(/\D/g, "");
      
      setDisplayValue(masked);
      
      if (onPhoneChange) {
        onPhoneChange(plain);
      }
      
      if (onChange) {
        // Construct a synthetic event for compatibility with generic forms
        const event = {
          ...e,
          target: {
            ...e.target,
            value: plain,
          },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }
    };

    return (
      <div className="space-y-2 w-full">
        {label && <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">{label}</Label>}
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none border-r border-border pr-3">
             <span className="text-lg">🇧🇷</span>
             <span className="text-xs font-bold text-muted-foreground">+55</span>
          </div>
          <Input
            ref={ref}
            type="text"
            className={cn(
              "pl-24 h-12 rounded-xl bg-muted/20 border-border/50 focus:ring-primary/20 font-bold tracking-wide transition-all",
              error && "border-red-500 focus:ring-red-500/20",
              className
            )}
            value={displayValue}
            onChange={handleChange}
            placeholder="(00) 00000-0000"
            {...props}
          />
        </div>
        {error && <p className="text-[10px] text-red-500 font-bold ml-1 italic">{error}</p>}
      </div>
    );
  }
);

PhoneInputBR.displayName = "PhoneInputBR";
