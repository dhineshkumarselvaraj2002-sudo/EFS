"use client"

import * as React from "react"
import { X, Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface FilterOption {
  key: string
  label: string
  type: "search" | "select" | "date" | "dateRange"
  options?: { label: string; value: string }[]
  placeholder?: string
}

interface DataTableFiltersProps {
  filters: FilterOption[]
  values: Record<string, any>
  onChange: (key: string, value: any) => void
  onClear?: () => void
  className?: string
}

export function DataTableFilters({
  filters,
  values,
  onChange,
  onClear,
  className,
}: DataTableFiltersProps) {
  const [openFilter, setOpenFilter] = React.useState<string | null>(null)
  const activeFiltersCount = Object.values(values).filter(v => v !== undefined && v !== "" && v !== null).length

  const handleClear = () => {
    filters.forEach(filter => onChange(filter.key, undefined))
    onClear?.()
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Search filters (always visible) */}
      {filters
        .filter(f => f.type === "search")
        .map(filter => (
          <div key={filter.key} className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={filter.placeholder || "Search..."}
              value={values[filter.key] || ""}
              onChange={(e) => onChange(filter.key, e.target.value)}
              className="h-9 w-[200px] pl-8"
            />
          </div>
        ))}

      {/* Other filters in popover */}
      {filters.filter(f => f.type !== "search").length > 0 && (
        <Popover open={openFilter !== null} onOpenChange={(open) => setOpenFilter(open ? "main" : null)}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 rounded-full px-1.5 py-0 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-4" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Filters</h4>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="h-7 text-xs"
                  >
                    Clear all
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {filters
                  .filter(f => f.type !== "search")
                  .map(filter => (
                    <div key={filter.key} className="space-y-2">
                      <label className="text-sm font-medium">{filter.label}</label>
                      {filter.type === "select" && (
                        <Select
                          value={values[filter.key] || ""}
                          onValueChange={(value) => {
                            onChange(filter.key, value === "all" ? undefined : value)
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={filter.placeholder || `Select ${filter.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {filter.options?.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {filter.type === "date" && (
                        <Input
                          type="date"
                          value={values[filter.key] || ""}
                          onChange={(e) => onChange(filter.key, e.target.value)}
                          className="h-9"
                        />
                      )}
                      {filter.type === "dateRange" && (
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            placeholder="From"
                            value={values[`${filter.key}_from`] || ""}
                            onChange={(e) => onChange(`${filter.key}_from`, e.target.value)}
                            className="h-9 flex-1"
                          />
                          <Input
                            type="date"
                            placeholder="To"
                            value={values[`${filter.key}_to`] || ""}
                            onChange={(e) => onChange(`${filter.key}_to`, e.target.value)}
                            className="h-9 flex-1"
                          />
                        </div>
                      )}
                      {values[filter.key] && filter.type !== "dateRange" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onChange(filter.key, undefined)}
                          className="h-7 w-full justify-start text-xs"
                        >
                          <X className="mr-1 h-3 w-3" />
                          Clear {filter.label}
                        </Button>
                      )}
                      {filter.type === "dateRange" && (values[`${filter.key}_from`] || values[`${filter.key}_to`]) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onChange(`${filter.key}_from`, undefined)
                            onChange(`${filter.key}_to`, undefined)
                          }}
                          className="h-7 w-full justify-start text-xs"
                        >
                          <X className="mr-1 h-3 w-3" />
                          Clear date range
                        </Button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Active filter badges */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map(filter => {
            const value = values[filter.key]
            if (!value || value === "") return null

            let displayValue = value
            if (filter.type === "select" && filter.options) {
              const option = filter.options.find(o => o.value === value)
              displayValue = option?.label || value
            }

            return (
              <Badge key={filter.key} variant="secondary" className="gap-1">
                {filter.label}: {displayValue}
                <button
                  onClick={() => onChange(filter.key, undefined)}
                  className="ml-1 rounded-full hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}

