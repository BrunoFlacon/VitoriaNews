import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface APIFieldsProps {
  config: any;
  credentials: Record<string, any>;
  fields: any[];
  updateFormField: (platform: string, key: string, value: string) => void;
  formValues: Record<string, Record<string, string>>;
}

export const APIFields = ({ config, credentials, fields, updateFormField, formValues }: APIFieldsProps) => {
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  const toggleFieldVisibility = (fieldKey: string) => {
    setVisibleFields(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const maskValue = (value: string) => {
    if (!value || value.length <= 6) return "â€¢â€¢â€¢â€¢â€¢â€¢";
    return value.slice(0, 3) + "â€¢â€¢â€¢â€¢â€¢â€¢" + value.slice(-3);
  };

  return (
    <div className="grid gap-3">
      {fields.map((field) => {
        const fieldId = `${config.id}-${field.key}`;
        const isVisible = visibleFields[fieldId] || false;
        const savedValue = credentials[config.id]?.[field.key];
        const formVal = formValues[config.id]?.[field.key];
        const credVal = credentials[config.id]?.[field.key];
        const val = formVal !== undefined && formVal !== "" ? formVal : (credVal || "");

        return (
          <div key={field.key} className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
              {field.label.includes("TOKEN") && config.id === 'telegram' ? "BOT TOKEN (@BOTFATHER)" : field.label}
            </label>
            <div className="relative">
              <Input
                id={fieldId}
                name={field.key}
                type={field.masked && !isVisible ? "password" : "text"}
                value={val}
                onChange={(e) => updateFormField(config.id, field.key, e.target.value)}
                placeholder={field.placeholder || (savedValue ? maskValue(savedValue) : `${field.label}`)}
                className={cn(
                  "bg-[#1A1F2C] border-white/10 h-11 text-sm font-medium focus-visible:ring-primary/50 placeholder:text-muted-foreground/50",
                  config.id === 'youtube' && field.key === 'client_id' && (val.startsWith('UC') || (val && !val.endsWith('.apps.googleusercontent.com') && val.length > 5)) && "border-red-500 ring-2 ring-red-500",
                  config.id === 'threads' && field.key === 'app_id' && val && !/^\d+$/.test(val) && "border-red-500 ring-2 ring-red-500"
                )}
                autoComplete={field.masked ? "current-password" : "off"}
              />
              {field.masked && (
                <button
                  type="button"
                  onClick={() => toggleFieldVisibility(fieldId)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};


