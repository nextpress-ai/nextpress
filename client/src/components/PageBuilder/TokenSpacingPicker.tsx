import { useState } from "react"
import { Input } from "@/components/ui/input"
import type { TokenEntry } from "@shared/schema-types"
import { tokenSpacing, propertyAliasMap, propertyUnitCategoryMap, unitCategories } from "@/lib/tailwind-tokens"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface TokenSpacingPickerProps {
  property: string                // CSS property: "paddingTop", "marginLeft", etc.
  currentEntry: TokenEntry | undefined
  currentStyleValue: string | undefined  // Fallback from block.styles for legacy blocks
  currentUnit: string             // Current unit for this category: "px", "rem"
  onUnitChange: (unit: string) => void
  onChange: (entry: TokenEntry) => void
}

// Curated subset of spacing scale (most useful values)
const SPACING_KEYS = ["0", "0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "5", "6", "7", "8", "9", "10", "11", "12", "14", "16", "20", "24", "28", "32", "36", "40", "44", "48", "52", "56", "60", "64", "72", "80", "96"]

export default function TokenSpacingPicker({ property, currentEntry, currentStyleValue, currentUnit, onUnitChange, onChange }: TokenSpacingPickerProps) {
  // Show custom input only when user explicitly chose custom (entry exists with empty value)
  // Default to token swatch view — tokens are the primary UX, custom is the escape hatch
  const isCustom = currentEntry ? !currentEntry.value && !!currentEntry.style : false
  const [showCustom, setShowCustom] = useState(isCustom)
  
  const alias = propertyAliasMap[property] || "p"
  const unitCategory = propertyUnitCategoryMap[property] || "spacing"
  const availableUnits = unitCategories[unitCategory] || ["px"]
  
  // Parse the legacy value for custom mode
  const parseValue = (val: string | undefined): string => {
    if (!val) return "0"
    const match = String(val).match(/^(\d*\.?\d+)/)
    return match ? match[1] : "0"
  }
  const customValue = currentEntry?.style || parseValue(currentStyleValue)

  const handleTokenSelect = (key: string) => {
    setShowCustom(false)
    const resolved = (tokenSpacing as Record<string, string>)[key]
    onChange({
      property,
      value: key,
      variant: null,
      alias,
      unitCategory,
      style: resolved || key,
    })
  }

  const handleCustomChange = (numericValue: string) => {
    onChange({
      property,
      value: "",
      variant: null,
      alias,
      style: numericValue,
      unitCategory,
    })
  }

  const isSelected = (key: string) => {
    if (!currentEntry || !currentEntry.value) return false
    return currentEntry.value === key
  }

  return (
    <div className="space-y-2">
      {/* Mode toggle + unit selector */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`text-xs px-2 py-1 border rounded-none transition-colors ${
            showCustom 
              ? "bg-gray-200 text-gray-800 border-gray-300" 
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          {showCustom ? "← Tokens" : "Custom"}
        </button>
      </div>

      {showCustom ? (
        /* Custom numeric input */
        <div className="flex gap-2">
          <Input
            type="number"
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="0"
            className="flex-1 h-8 text-xs border-gray-200 rounded-none focus:outline-none focus:ring-1 focus:ring-gray-400 text-center"
            min="0"
            step="1"
          />
          <Select value={currentUnit} onValueChange={onUnitChange}>
            <SelectTrigger
              className={cn(
                "h-8 w-[4.25rem] rounded-none px-2 text-xs",
                "npb-settings-select-trigger",
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableUnits.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        /* Token chips grid */
        <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
          {SPACING_KEYS.map((key) => {
            const resolved = (tokenSpacing as Record<string, string>)[key]
            if (!resolved) return null
            return (
              <button
                key={key}
                onClick={() => handleTokenSelect(key)}
                className={`px-2 py-1 text-xs border rounded-none transition-colors min-w-[2rem] ${
                  isSelected(key)
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                }`}
                title={`${key}: ${resolved}`}
              >
                {key}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
