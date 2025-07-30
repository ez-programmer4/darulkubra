import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { FiCalendar, FiChevronDown } from "react-icons/fi";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onDateChange: (startDate: string, endDate: string) => void;
  className?: string;
}

interface PresetRange {
  label: string;
  days?: number;
  custom?: string;
}

const PRESET_RANGES: PresetRange[] = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "This month", custom: "this-month" },
  { label: "Last month", custom: "last-month" },
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onDateChange,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetClick = (preset: PresetRange) => {
    let newStartDate: string;
    let newEndDate: string;

    if (preset.custom === "this-month") {
      const now = new Date();
      newStartDate = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      newEndDate = new Date().toISOString().split("T")[0];
    } else if (preset.custom === "last-month") {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      newStartDate = lastMonth.toISOString().split("T")[0];
      newEndDate = new Date(now.getFullYear(), now.getMonth(), 0)
        .toISOString()
        .split("T")[0];
    } else if (preset.days) {
      const end = new Date();
      const start = new Date(end.getTime() - preset.days * 24 * 60 * 60 * 1000);
      newStartDate = start.toISOString().split("T")[0];
      newEndDate = end.toISOString().split("T")[0];
    } else {
      // Fallback to last 30 days if no valid preset
      const end = new Date();
      const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      newStartDate = start.toISOString().split("T")[0];
      newEndDate = end.toISOString().split("T")[0];
    }

    onDateChange(newStartDate, newEndDate);
    setIsOpen(false);
  };

  const handleCustomDateChange = (type: "start" | "end", value: string) => {
    if (type === "start") {
      onDateChange(value, endDate);
    } else {
      onDateChange(startDate, value);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center space-x-2">
              <FiCalendar className="h-5 w-5 text-blue-600" />
              <span>Date Range</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center space-x-1"
            >
              <span>Presets</span>
              <FiChevronDown
                className={`h-4 w-4 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Custom Date Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  handleCustomDateChange("start", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleCustomDateChange("end", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Preset Ranges */}
          {isOpen && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Quick Presets
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_RANGES.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetClick(preset)}
                    className="justify-start text-left"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Current Range Display */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                {new Date(startDate).toLocaleDateString()} -{" "}
                {new Date(endDate).toLocaleDateString()}
              </Badge>
            </div>
            <div className="text-sm text-gray-500">
              {Math.ceil(
                (new Date(endDate).getTime() - new Date(startDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              )}{" "}
              days
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DateRangePicker;
