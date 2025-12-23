import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Pipette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string; // HSL format: "222.2 47.4% 11.2%"
  onChange: (value: string) => void;
  label?: string;
}

// Convert HSL string to hex
const hslToHex = (hslString: string): string => {
  try {
    const parts = hslString.trim().split(/\s+/);
    if (parts.length < 3) return '#000000';
    
    const h = parseFloat(parts[0]) / 360;
    const s = parseFloat(parts[1].replace('%', '')) / 100;
    const l = parseFloat(parts[2].replace('%', '')) / 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch {
    return '#000000';
  }
};

// Convert hex to HSL string
const hexToHsl = (hex: string): string => {
  try {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '0 0% 0%';

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return `${(h * 360).toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
  } catch {
    return '0 0% 0%';
  }
};

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label }) => {
  const [hexValue, setHexValue] = useState(() => hslToHex(value));
  const [hslValue, setHslValue] = useState(value);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setHexValue(hslToHex(value));
    setHslValue(value);
  }, [value]);

  const handleHexChange = useCallback((newHex: string) => {
    setHexValue(newHex);
    if (/^#[0-9A-Fa-f]{6}$/.test(newHex)) {
      const newHsl = hexToHsl(newHex);
      setHslValue(newHsl);
      onChange(newHsl);
    }
  }, [onChange]);

  const handleHslChange = useCallback((newHsl: string) => {
    setHslValue(newHsl);
    onChange(newHsl);
    try {
      setHexValue(hslToHex(newHsl));
    } catch {
      // Invalid HSL, ignore hex update
    }
  }, [onChange]);

  const handleColorInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    handleHexChange(newHex);
  }, [handleHexChange]);

  // Preset colors for quick selection
  const presets = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#14B8A6', // Teal
    '#84CC16', // Lime
    '#A855F7', // Violet
  ];

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-auto py-2",
              !value && "text-muted-foreground"
            )}
          >
            <div
              className="h-6 w-6 rounded border border-border mr-2 shrink-0"
              style={{ backgroundColor: `hsl(${value})` }}
            />
            <div className="flex flex-col items-start gap-0.5 overflow-hidden">
              <span className="text-xs text-muted-foreground truncate w-full">{hexValue}</span>
              <span className="text-xs text-muted-foreground/70 truncate w-full">{hslValue}</span>
            </div>
            <Pipette className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4 bg-popover" align="start">
          <div className="space-y-4">
            {/* Native color picker */}
            <div className="space-y-2">
              <Label className="text-xs">Color Wheel</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={hexValue}
                  onChange={handleColorInputChange}
                  className="h-10 w-full cursor-pointer rounded border border-border"
                />
              </div>
            </div>

            {/* Hex input */}
            <div className="space-y-2">
              <Label className="text-xs">Hex Code</Label>
              <Input
                value={hexValue}
                onChange={(e) => handleHexChange(e.target.value)}
                placeholder="#000000"
                className="font-mono text-sm"
              />
            </div>

            {/* HSL input */}
            <div className="space-y-2">
              <Label className="text-xs">HSL Value</Label>
              <Input
                value={hslValue}
                onChange={(e) => handleHslChange(e.target.value)}
                placeholder="0 0% 0%"
                className="font-mono text-sm"
              />
            </div>

            {/* Color presets */}
            <div className="space-y-2">
              <Label className="text-xs">Presets</Label>
              <div className="grid grid-cols-6 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={cn(
                      "h-6 w-6 rounded border border-border transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      hexValue.toLowerCase() === preset.toLowerCase() && "ring-2 ring-primary"
                    )}
                    style={{ backgroundColor: preset }}
                    onClick={() => handleHexChange(preset)}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-xs">Preview</Label>
              <div
                className="h-12 w-full rounded border border-border"
                style={{ backgroundColor: `hsl(${hslValue})` }}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ColorPicker;
