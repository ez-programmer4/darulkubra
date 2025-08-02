import React, { useState, useEffect } from "react";
import {
  generateTimeSlots,
  groupSlotsByCategory,
  sortTimeSlots,
  TimeSlot,
  DEFAULT_PRAYER_TIMES,
  validateTime,
  to12Hour,
  to24Hour,
} from "@/utils/timeUtils";
import { Button } from "./button";
import { Card } from "./card";
import { Badge } from "./badge";
import { FiClock, FiCheck, FiX } from "react-icons/fi";

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  teacherSchedule?: string;
  disabled?: boolean;
  className?: string;
  showCategories?: boolean;
  hideCustomTime?: boolean; // NEW: hide custom time input
}

interface TimeSlotCardProps {
  slot: TimeSlot;
  isSelected: boolean;
  onSelect: (time: string) => void;
  disabled?: boolean;
  showOccupied?: boolean;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case "After Fajr":
      return "bg-yellow-50 border-yellow-200 text-yellow-800";
    case "After Dhuhr":
      return "bg-blue-50 border-blue-200 text-blue-800";
    case "After Asr":
      return "bg-purple-50 border-purple-200 text-purple-800";
    case "After Maghrib":
      return "bg-orange-50 border-orange-200 text-orange-800";
    case "After Isha":
      return "bg-gray-50 border-gray-200 text-gray-800";
    default:
      return "bg-gray-50 border-gray-200 text-gray-800";
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "After Fajr":
      return "🌅";
    case "After Dhuhr":
      return "☀️";
    case "After Asr":
      return "🌤️";
    case "After Maghrib":
      return "🌆";
    case "After Isha":
      return "🌙";
    default:
      return "⏰";
  }
};

const TimeSlotCard: React.FC<TimeSlotCardProps> = ({
  slot,
  isSelected,
  onSelect,
  disabled = false,
  showOccupied = false,
}) => {
  return (
    <Card
      className={`
        relative p-4 cursor-pointer transition-all duration-200 hover:shadow-md
        ${isSelected ? "ring-2 ring-green-500 bg-green-50" : "hover:bg-gray-50"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
      onClick={() => !disabled && onSelect(slot.time)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{getCategoryIcon(slot.category)}</div>
          <div>
            <div className="font-semibold text-lg">{slot.time}</div>
            <div className="text-sm text-gray-600">{slot.category}</div>
          </div>
        </div>

        {isSelected && (
          <div className="text-green-600">
            <FiCheck className="w-5 h-5" />
          </div>
        )}
      </div>
    </Card>
  );
};

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  teacherSchedule,
  disabled = false,
  className = "",
  showCategories = true,
  hideCustomTime = false,
}) => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [groupedSlots, setGroupedSlots] = useState<Record<string, TimeSlot[]>>(
    {}
  );
  const [selectedTime, setSelectedTime] = useState<string>(value || "");
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [customTimeError, setCustomTimeError] = useState<string | null>(null);

  useEffect(() => {
    if (teacherSchedule) {
      const slots = generateTimeSlots(teacherSchedule, DEFAULT_PRAYER_TIMES);
      const sortedSlots = sortTimeSlots(slots);
      setTimeSlots(sortedSlots);
      setGroupedSlots(groupSlotsByCategory(sortedSlots));
    } else {
      setTimeSlots([]);
      setGroupedSlots({});
    }
  }, [teacherSchedule]);

  useEffect(() => {
    if (value) {
      setSelectedTime(value);
    }
  }, [value]);

  const handleTimeSelect = (time: string) => {
    const time12Hour = to12Hour(time);
    setSelectedTime(time12Hour);
    onChange(time12Hour);
  };

  const handleCustomTimeSubmit = () => {
    if (validateTime(customTime)) {
      const time12Hour = to12Hour(customTime);
      setSelectedTime(time12Hour);
      onChange(time12Hour);
      setShowCustomTime(false);
      setCustomTime("");
      setCustomTimeError(null);
    } else {
      setCustomTimeError(
        "Please enter a valid time format (e.g., 4:00 PM or 16:00)"
      );
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Selected Time Display */}
      {selectedTime && (
        <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <FiClock className="text-green-600" />
          <span className="font-semibold text-green-800">
            Selected: {selectedTime}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedTime("");
              onChange("");
            }}
            className="text-red-600 hover:text-red-700"
          >
            <FiX className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Time Slots Grid */}
      {showCategories ? (
        // Grouped by prayer categories
        <div className="space-y-6">
          {Object.entries(groupedSlots).map(([category, slots]) => (
            <div key={category} className="space-y-3">
              <h3 className="font-semibold text-gray-700 flex items-center space-x-2">
                <span>{getCategoryIcon(category)}</span>
                <span>{category}</span>
                <Badge variant="secondary">{slots.length} slots</Badge>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {slots.map((slot) => (
                  <TimeSlotCard
                    key={slot.id}
                    slot={slot}
                    isSelected={selectedTime === slot.time}
                    onSelect={handleTimeSelect}
                    disabled={disabled}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Simple grid
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {timeSlots.map((slot) => (
            <TimeSlotCard
              key={slot.id}
              slot={slot}
              isSelected={selectedTime === slot.time}
              onSelect={handleTimeSelect}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {/* Custom Time Input */}
      {!hideCustomTime && (
        <div className="border-t pt-4">
          <Button
            variant="outline"
            onClick={() => setShowCustomTime(!showCustomTime)}
            className="w-full"
          >
            {showCustomTime ? "Cancel" : "Enter Custom Time"}
          </Button>

          {showCustomTime && (
            <div className="mt-3 space-y-3">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="e.g., 4:00 PM or 16:00"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                  disabled={disabled}
                />
                <Button
                  variant="default"
                  onClick={handleCustomTimeSubmit}
                  disabled={disabled}
                >
                  Set
                </Button>
              </div>
              {customTimeError && (
                <div className="text-red-600 text-sm">{customTimeError}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Prayer Times Info */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
        <div className="font-semibold mb-2">Prayer Times (Addis Ababa):</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {Object.entries(DEFAULT_PRAYER_TIMES).map(([prayer, time]) => (
            <div key={prayer} className="flex justify-between">
              <span>{prayer}:</span>
              <span className="font-mono">{time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimePicker;
