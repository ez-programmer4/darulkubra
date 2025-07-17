"use client";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useState, useEffect, useCallback } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiInfo,
  FiUser,
  FiPhone,
  FiCalendar,
  FiDollarSign,
  FiGlobe,
  FiBook,
  FiTag,
  FiBookOpen,
  FiFlag,
  FiUserCheck,
  FiStar,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import Cookies from "js-cookie";
import { useSession } from "next-auth/react";

interface FormData {
  fullName?: string;
  phoneNumber?: string;
  classfee?: number;
  startdate?: string;
  status?: string;
  subject?: string;
  country?: string;
  rigistral?: string;
  daypackages?: string;
  package?: string;
  refer?: string;
}

interface TimeSlot {
  id: number;
  time: string;
  category: string;
}

interface Teacher {
  ustazid: string;
  ustazname: string;
  control: { id: number; username: string };
}

interface TimeSlotResponse {
  timeSlots: TimeSlot[];
}

interface TeacherResponse {
  teachers: Teacher[];
}

interface Country {
  name: { common: string };
}

const convertTo12Hour = (time: string): string => {
  try {
    if (time.includes("AM") || time.includes("PM")) {
      return time.trim();
    }
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(time)) {
      throw new Error(
        `Invalid time format: ${time}. Expected HH:MM or HH:MM:SS`
      );
    }
    const [hour, minute] = time
      .split(":")
      .map((part) => parseInt(part.trim(), 10));
    const period = hour >= 12 ? "PM" : "AM";
    const adjustedHour = hour % 12 || 12;
    return `${adjustedHour}:${minute.toString().padStart(2, "0")} ${period}`;
  } catch (error) {
    console.error("Error converting to 12-hour format:", error);
    return "Invalid Time";
  }
};

export default function Registration() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const initialStep = parseInt(searchParams.get("step") || "1", 10);
  const [editTimeTeacher, setEditTimeTeacher] = useState(false);
  const { data: session, status } = useSession();

  const [step, setStep] = useState<number>(
    editId ? 3 : Math.min(Math.max(initialStep, 1), 3)
  );
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [countries, setCountries] = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      daypackages: "All Day Package",
      package: "",
    },
  });

  const selectedDayPackage = watch("daypackages");

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]); // Ensure initialized as empty array
  const [dayPackages] = useState<string[]>([
    "All Day Package",
    "Monday, Wednesday, Friday",
    "Tuesday, Thursday, Saturday",
  ]);

  const [error, setError] = useState<string | null>(null);
  const [editingTeacherName, setEditingTeacherName] = useState<string>("");

  const [availableTimeSlots, setAvailableTimeSlots] = useState<{
    [time: string]: boolean;
  }>({});
  const [loadingAvailability, setLoadingAvailability] =
    useState<boolean>(false);

  // Add state for controllers
  const [controllers, setControllers] = useState<
    { username: string; name: string }[]
  >([]);
  const [loadingControllers, setLoadingControllers] = useState(false);
  const [controllersError, setControllersError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCountries = async () => {
      setLoadingCountries(true);
      setFetchError(null);
      try {
        const response = await fetch("https://restcountries.com/v3.1/all");
        if (!response.ok) throw new Error("Failed to fetch countries from API");
        const data: Country[] = await response.json();
        const countryNames = data.map((country) => country.name.common).sort();
        setCountries(countryNames);
      } catch (err) {
        setFetchError(
          "Failed to load countries from API. Using fallback list."
        );
        const fallbackCountries = ["Ethiopia", "KSA", "UAE"];
        setCountries(fallbackCountries);
      } finally {
        setLoadingCountries(false);
      }
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [timeResponse] = await Promise.all([fetch("/api/time-slots")]);

        if (!timeResponse.ok)
          throw new Error(
            `Time slots fetch failed: ${timeResponse.statusText}`
          );

        const timeData: TimeSlotResponse = await timeResponse.json();

        setTimeSlots(timeData.timeSlots);
        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
      }
    };
    fetchData();
  }, []);

  const fetchTeachers = useCallback(async () => {
    if (!selectedTime || !selectedDayPackage) {
      setTeachers([]);
      return;
    }
    try {
      const response = await fetch(
        `/api/teachers-by-time?selectedTime=${encodeURIComponent(
          selectedTime
        )}&selectedDayPackage=${encodeURIComponent(selectedDayPackage)}`
      );
      const data = await response.json();
      console.log("Raw API Response:", data); // Log raw response to confirm
      if (!response.ok) {
        throw new Error(
          data.message || `Teachers fetch failed: ${response.statusText}`
        );
      }
      // Handle both { teachers: [...] } and [...] directly
      const teacherData = Array.isArray(data) ? { teachers: data } : data;
      if (
        selectedTeacher &&
        !teacherData.teachers.some(
          (t: Teacher) => t.ustazid === selectedTeacher
        )
      ) {
        setSelectedTeacher("");
      }
      setTeachers(teacherData.teachers || []);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setTeachers([]);
    }
  }, [selectedTime, selectedDayPackage, selectedTeacher]);

  useEffect(() => {
    if (step === 2) {
      fetchTeachers();
    }
  }, [step, fetchTeachers]);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!editId) return;
      if (editId) {
        try {
          const response = await fetch(`/api/registrations?id=${editId}`);
          if (!response.ok) {
            throw new Error(
              `Failed to fetch student data: ${response.statusText}`
            );
          }
          const data = await response.json();

          const timeSlotResponse = await fetch(
            `/api/occupied-times?studentId=${editId}`
          );
          if (!timeSlotResponse.ok) {
            throw new Error(
              `Failed to fetch time slot: ${timeSlotResponse.statusText}`
            );
          }
          const timeSlotData = await timeSlotResponse.json();
          const fetchedTimeSlot = timeSlotData.time_slot || "";

          let fetchedSelectedTime = fetchedTimeSlot;
          if (
            fetchedTimeSlot &&
            !/^\d{1,2}:\d{2}\s?(AM|PM)?$/.test(fetchedTimeSlot)
          ) {
            const [hour, minute] = fetchedTimeSlot.split(":").map(Number);
            if (!isNaN(hour) && minute !== undefined && !isNaN(minute)) {
              fetchedSelectedTime = `${hour % 12 || 12}:${minute
                .toString()
                .padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
            } else {
              fetchedSelectedTime = "12:00 PM";
            }
          }

          setValue("fullName", data.name || "");
          setValue("phoneNumber", data.phoneno || "");
          setValue("classfee", data.classfee || "");
          setValue(
            "startdate",
            data.startdate
              ? new Date(data.startdate).toISOString().split("T")[0]
              : ""
          );
          setValue("status", data.status || "active");
          setValue("subject", data.subject || "");
          setValue("country", data.country || "");
          setValue("rigistral", data.rigistral || "");
          setValue("daypackages", data.daypackages || "All Day Package");
          setValue("refer", data.refer || "");
          setValue("package", data.package || "");
          setSelectedTime(fetchedSelectedTime);
          setSelectedTeacher(data.ustaz || "");
          setEditingTeacherName(data.ustaz || "");
          await fetchTeachers();
        } catch (error) {
          setFetchError("Failed to load student data for editing.");
        }
        setStep(3);
      }
    };
    fetchStudentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, setValue]);

  // --- ENHANCEMENT: Always re-check teachers when day package changes in edit mode ---
  useEffect(() => {
    if (editId && editTimeTeacher && selectedTime && selectedDayPackage) {
      fetchTeachers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDayPackage, selectedTime, editId, editTimeTeacher]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsSubmitting(true);

    try {
      if (
        (!editId || editTimeTeacher) &&
        (!selectedTeacher || selectedTeacher.trim() === "")
      ) {
        throw new Error("Teacher is required");
      }

      const isoStartDate = data.startdate
        ? new Date(`${data.startdate}T00:00:00.000Z`).toISOString()
        : undefined;

      const selectedUstaz = teachers.find((t) => t.ustazid === selectedTeacher);
      const control = selectedUstaz ? selectedUstaz.control.username : null;

      const payload = {
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        classfee: data.classfee ? parseFloat(data.classfee as any) : null,
        startdate: isoStartDate,
        control: control, // Automatically set based on selected ustaz's controlId
        status: data.status?.toLowerCase() || "pending",
        ustaz:
          !editId || editTimeTeacher ? selectedTeacher : editingTeacherName,
        package: data.package, // region
        subject: data.subject,
        country: data.country || null,
        rigistral: data.rigistral || null,
        daypackages: data.daypackages, // day package
        refer: data.refer || null,
        selectedTime:
          !editId || editTimeTeacher
            ? selectedTime
            : editId
            ? selectedTime
            : undefined,
        registrationdate: editId ? undefined : new Date().toISOString(),
      };

      const url = editId
        ? `/api/registrations?id=${editId}`
        : "/api/registrations";
      const method = editId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message ||
            (editId ? "Update failed" : "Registration failed")
        );
      }

      const result = await response.json();
      toast.success(
        result.message ||
          (editId
            ? "Registration updated successfully"
            : "Registration successful")
      );
      window.location.href = "/dashboard";
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : editId
          ? "Update failed. Please try again."
          : "Registration failed. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupedTimeSlots = timeSlots.reduce((acc, slot) => {
    acc[slot.category] = acc[slot.category] || [];
    acc[slot.category].push(slot);
    return acc;
  }, {} as { [key: string]: TimeSlot[] });

  const today = new Date().toISOString().split("T")[0];

  const groupedCountries = countries.reduce((acc, country) => {
    const firstLetter = country[0].toUpperCase();
    acc[firstLetter] = acc[firstLetter] || [];
    acc[firstLetter].push(country);
    return acc;
  }, {} as { [key: string]: string[] });

  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, session, router]);

  useEffect(() => {
    const checkAvailability = async () => {
      if (!selectedDayPackage) return;
      setLoadingAvailability(true);
      const availability: { [time: string]: boolean } = {};
      await Promise.all(
        timeSlots.map(async (slot) => {
          try {
            const res = await fetch(
              `/api/teachers-by-time?selectedTime=${encodeURIComponent(
                slot.time
              )}&selectedDayPackage=${encodeURIComponent(selectedDayPackage)}`
            );
            if (!res.ok) {
              availability[slot.time] = false;
              return;
            }
            const data = await res.json();
            const teachers = Array.isArray(data) ? data : data.teachers;
            availability[slot.time] = teachers && teachers.length > 0;
          } catch {
            availability[slot.time] = false;
          }
        })
      );
      setAvailableTimeSlots(availability);
      setLoadingAvailability(false);
    };
    if (timeSlots.length > 0 && selectedDayPackage) {
      checkAvailability();
    }
  }, [timeSlots, selectedDayPackage]);

  useEffect(() => {
    setSelectedTime("");
  }, [selectedDayPackage]);

  // Fetch controllers for refer dropdown
  useEffect(() => {
    if (session?.user?.role === "registral") {
      setLoadingControllers(true);
      setControllersError(null);
      fetch("/api/control-options")
        .then((res) => res.json())
        .then((data) => {
          setControllers(data.controllers || []);
        })
        .catch(() => setControllersError("Failed to load controllers"))
        .finally(() => setLoadingControllers(false));
    }
  }, [session]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-teal-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-teal-500 mb-4"></div>
          <p className="text-gray-600">Loading registration form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-teal-50 flex items-center justify-center p-4 md:p-8 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-3xl md:max-w-5xl lg:max-w-6xl"
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-t-4 border-teal-500">
          <div className="bg-gradient-to-r from-teal-600 to-indigo-600 p-6 text-white">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center">
                <img
                  src="https://darelkubra.com/wp-content/uploads/2024/06/cropped-%E1%8B%B3%E1%88%A9%E1%88%8D-%E1%88%8E%E1%8C%8E-150x150.png"
                  alt="Darulkubra Quran Academy Logo"
                  className="h-14 w-14 mr-4 rounded-full border-2 border-white/90 shadow-md"
                />
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Darulkubra Quran Academy
                  </h1>
                  <p className="text-sm text-teal-100 font-medium">
                    Registration Portal
                  </p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-full px-6 py-2 text-sm font-semibold flex items-center shadow-inner">
                <span className="mr-3">Step {step} of 3</span>
                <div className="flex space-x-1.5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-3 w-3 rounded-full transition-all duration-300 ${
                        step >= i ? "bg-teal-300 shadow-md" : "bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5 w-full bg-white/20 rounded-full h-2.5 shadow-inner">
              <motion.div
                className="bg-teal-300 h-2.5 rounded-full shadow-md"
                initial={{ width: 0 }}
                animate={{ width: `${(step / 3) * 100}%` }}
                transition={{ duration: 0.9, ease: "easeInOut" }}
              />
            </div>
          </div>

          <div className="p-6 md:p-10 bg-gray-50">
            {editId && (
              <div className="mb-6 flex items-center space-x-3">
                <input
                  id="edit-time-teacher"
                  type="checkbox"
                  checked={editTimeTeacher}
                  onChange={() => {
                    setEditTimeTeacher((v) => !v);
                    setStep((v) => (v === 3 ? 1 : 3));
                  }}
                  className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <label
                  htmlFor="edit-time-teacher"
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Edit Time Slot, Package, and Teacher
                </label>
              </div>
            )}
            <AnimatePresence mode="wait">
              {(!editId || (editId && editTimeTeacher)) && step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="space-y-8"
                >
                  <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                    Select Preferred Time Slot
                  </h2>

                  {/* Day Package Dropdown (Step 1 only, restored) */}
                  <div className="flex flex-col md:flex-row items-start md:items-center bg-white rounded-2xl p-5 shadow-md border border-gray-100 w-full md:w-auto transition-all duration-300 hover:shadow-lg mb-4">
                    <label className="flex items-center text-sm font-semibold text-gray-800 mb-3 md:mb-0 md:mr-5">
                      <FiCalendar className="mr-2 text-teal-600" />
                      Day Package:
                    </label>
                    <select
                      {...register("daypackages", {
                        required: "Day package is required",
                      })}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-2.5 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-sm font-medium text-gray-800 w-full md:w-auto transition-all duration-200 hover:border-teal-500"
                    >
                      {dayPackages.length > 0 ? (
                        dayPackages.map((pkg, index) => (
                          <option
                            key={index}
                            value={pkg}
                            className="text-gray-800"
                          >
                            {pkg}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled className="text-gray-400">
                          No options available
                        </option>
                      )}
                    </select>
                    {dayPackages.length === 0 && (
                      <p className="text-red-600 text-xs mt-2">
                        Error: Day packages not loaded.
                      </p>
                    )}
                  </div>
                  {/* Analysis for availability */}
                  {(() => {
                    const totalSlots =
                      Object.values(groupedTimeSlots).flat().length;
                    const availableSlots =
                      Object.values(availableTimeSlots).filter(Boolean).length;
                    const unavailableSlots = totalSlots - availableSlots;
                    // Find most/least available time(s) (optional, here just show counts)
                    return (
                      <div className="flex flex-wrap gap-4 mb-4">
                        <div className="bg-teal-50 border-l-4 border-teal-400 rounded-xl px-6 py-3 text-teal-800 font-semibold shadow-sm">
                          Total Time Slots: {totalSlots}
                        </div>
                        <div className="bg-green-50 border-l-4 border-green-400 rounded-xl px-6 py-3 text-green-800 font-semibold shadow-sm">
                          Available: {availableSlots}
                        </div>
                        <div className="bg-gray-100 border-l-4 border-gray-400 rounded-xl px-6 py-3 text-gray-700 font-semibold shadow-sm">
                          Unavailable: {unavailableSlots}
                        </div>
                      </div>
                    );
                  })()}
                  {/* Legend */}
                  <div className="flex items-center space-x-6 mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="inline-block w-5 h-5 rounded bg-teal-600 border border-teal-600"></span>
                      <span className="text-sm text-gray-700">Available</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-block w-5 h-5 rounded bg-gray-200 border border-gray-300"></span>
                      <span className="text-sm text-gray-700">Unavailable</span>
                    </div>
                  </div>
                  {/* Loading spinner */}
                  {loadingAvailability && (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-teal-500"></div>
                      <span className="ml-4 text-teal-600 font-medium">
                        Checking availability...
                      </span>
                    </div>
                  )}
                  {/* Time slot grid */}
                  {!loadingAvailability && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {Object.keys(groupedTimeSlots).map((category) => (
                          <div
                            key={category}
                            className="bg-white rounded-2xl p-5 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100"
                          >
                            <h3 className="text-xl font-semibold text-teal-600 mb-4 flex items-center">
                              <span className="w-4 h-4 bg-teal-500 rounded-full mr-3 shadow-sm"></span>
                              {category}
                            </h3>
                            <div className="space-y-3">
                              {groupedTimeSlots[category].map((slot) => (
                                <motion.button
                                  key={slot.id}
                                  type="button"
                                  onClick={() => {
                                    if (availableTimeSlots[slot.time]) {
                                      setSelectedTime(slot.time);
                                      setStep(2);
                                    }
                                  }}
                                  disabled={!availableTimeSlots[slot.time]}
                                  whileHover={
                                    availableTimeSlots[slot.time]
                                      ? { scale: 1.03 }
                                      : {}
                                  }
                                  whileTap={
                                    availableTimeSlots[slot.time]
                                      ? { scale: 0.97 }
                                      : {}
                                  }
                                  className={`w-full text-left p-4 rounded-xl transition-all duration-200 text-sm font-semibold flex items-center shadow-sm ${
                                    selectedTime === slot.time
                                      ? "bg-teal-600 text-white shadow-md"
                                      : availableTimeSlots[slot.time]
                                      ? "bg-gray-50 text-gray-800 hover:bg-teal-50 border border-gray-200 hover:border-teal-300"
                                      : "bg-gray-200 text-gray-400 border border-gray-200 cursor-not-allowed"
                                  }`}
                                  title={
                                    availableTimeSlots[slot.time]
                                      ? ""
                                      : "No teacher available for this time and package"
                                  }
                                >
                                  <span className="flex-1">{slot.time}</span>
                                  <FiArrowRight
                                    className={`ml-2 ${
                                      selectedTime === slot.time
                                        ? "text-white"
                                        : availableTimeSlots[slot.time]
                                        ? "text-gray-500"
                                        : "text-gray-400"
                                    }`}
                                  />
                                </motion.button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* No available slots message */}
                      {Object.values(availableTimeSlots).length > 0 &&
                        Object.values(availableTimeSlots).every((v) => !v) && (
                          <div className="text-center py-8">
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-xl inline-block shadow-sm">
                              <p className="text-yellow-700 font-medium text-lg">
                                No available time slots for the selected day
                                package. Please try a different package.
                              </p>
                            </div>
                          </div>
                        )}
                    </>
                  )}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-red-50 border-l-4 border-red-500 p-5 rounded-lg shadow-sm"
                    >
                      <p className="text-red-700 font-medium">Error: {error}</p>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {(!editId || (editId && editTimeTeacher)) && step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="space-y-8"
                >
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center text-teal-600 hover:text-teal-800 text-sm font-semibold transition-colors duration-200"
                  >
                    <FiArrowLeft className="mr-2" />
                    Back to Time Selection
                  </button>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                      Available Teachers
                    </h2>
                    <p className="text-gray-600 text-lg leading-relaxed">
                      For{" "}
                      <span className="font-semibold text-teal-600">
                        {selectedTime}
                      </span>{" "}
                      on{" "}
                      <span className="font-semibold text-teal-600">
                        {selectedDayPackage}
                      </span>
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {error ? (
                      <div className="col-span-full py-10 text-center">
                        <div className="bg-red-50 rounded-xl p-8 inline-block shadow-sm">
                          <p className="text-red-700 font-medium">
                            Error: {error}
                          </p>
                        </div>
                      </div>
                    ) : teachers && teachers.length > 0 ? (
                      teachers.map((teacher) => (
                        <motion.div
                          key={teacher.ustazid}
                          onClick={() => setSelectedTeacher(teacher.ustazid)}
                          whileHover={{ y: -5 }}
                          className={`p-5 rounded-xl cursor-pointer transition-all duration-300 border shadow-sm ${
                            selectedTeacher === teacher.ustazid
                              ? "border-teal-500 bg-teal-50 shadow-md"
                              : "border-gray-200 hover:border-teal-400 bg-white hover:shadow-md"
                          }`}
                        >
                          <div className="flex items-center">
                            <div
                              className={`h-6 w-6 rounded-full border mr-4 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                selectedTeacher === teacher.ustazid
                                  ? "bg-teal-600 border-teal-600"
                                  : "border-gray-300"
                              }`}
                            >
                              {selectedTeacher === teacher.ustazid && (
                                <FiCheck className="h-4 w-4 text-white" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {teacher.ustazname}
                              </p>
                              <p className="text-xs text-gray-600 mt-1.5">
                                Available (Controller:{" "}
                                {teacher.control.username})
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="col-span-full py-10 text-center">
                        <div className="bg-gray-50 rounded-xl p-8 inline-block shadow-sm">
                          <p className="text-gray-600 font-medium">
                            No teachers are available for{" "}
                            <span className="font-semibold">
                              {selectedTime}
                            </span>{" "}
                            on{" "}
                            <span className="font-semibold">
                              {selectedDayPackage}
                            </span>
                            . Please select a different time slot or package.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-6">
                    <motion.button
                      type="button"
                      onClick={() => setStep(3)}
                      disabled={
                        !selectedTeacher ||
                        !selectedTime ||
                        !availableTimeSlots[selectedTime]
                      }
                      whileHover={
                        selectedTeacher &&
                        selectedTime &&
                        availableTimeSlots[selectedTime]
                          ? { scale: 1.03 }
                          : {}
                      }
                      whileTap={
                        selectedTeacher &&
                        selectedTime &&
                        availableTimeSlots[selectedTime]
                          ? { scale: 0.97 }
                          : {}
                      }
                      className={`px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 flex items-center ${
                        !selectedTeacher ||
                        !selectedTime ||
                        !availableTimeSlots[selectedTime]
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-teal-600 hover:bg-teal-700"
                      }`}
                    >
                      Continue <FiArrowRight className="ml-2" />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.form
                  key="step3"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-8"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!editId || (editId && editTimeTeacher)) {
                        setStep(2);
                      }
                    }}
                    disabled={!!editId && !editTimeTeacher}
                    title={
                      !!editId && !editTimeTeacher
                        ? "Enable 'Edit Time Slot, Package, and Teacher' to change teacher/time."
                        : ""
                    }
                    className={`flex items-center text-teal-600 hover:text-teal-800 text-sm font-semibold transition-colors duration-200 ${
                      !!editId && !editTimeTeacher
                        ? "opacity-60 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    <FiArrowLeft className="mr-2" />
                    Back to Teacher Selection
                  </button>

                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                      {editId
                        ? "Edit Your Registration"
                        : "Complete Your Registration"}
                    </h2>
                    <p className="text-gray-600 text-lg leading-relaxed">
                      {editId
                        ? "Update the required details"
                        : "Please fill in the required details"}
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 transition-all duration-300 hover:shadow-lg">
                    <h3 className="text-xl font-semibold text-teal-600 mb-4 flex items-center">
                      <FiInfo className="mr-2" />
                      Your Selection
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Time Slot
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {selectedTime || "Not selected"}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Teacher
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {teachers.find((t) => t.ustazid === selectedTeacher)
                            ?.ustazname ||
                            (editId && editingTeacherName) ||
                            "Not selected"}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Day Package
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {selectedDayPackage || "Not selected"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800 flex items-center">
                        <FiUser className="mr-2 text-teal-600" />
                        Full Name *
                      </label>
                      <input
                        {...register("fullName", {
                          required: "Full Name is required",
                          minLength: {
                            value: 2,
                            message: "Full Name must be at least 2 characters",
                          },
                        })}
                        className={`w-full px-5 py-3 rounded-xl border focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-sm font-medium transition-all duration-200 shadow-sm ${
                          errors.fullName
                            ? "border-red-500"
                            : "border-gray-200 hover:border-teal-300"
                        }`}
                        placeholder="Enter full name"
                      />
                      {errors.fullName && (
                        <p className="mt-1 text-xs text-red-600 font-medium">
                          {errors.fullName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800 flex items-center">
                        <FiPhone className="mr-2 text-teal-600" />
                        Phone Number *
                      </label>
                      <PhoneInput
                        country={"sd"} // or your preferred default country code
                        value={watch("phoneNumber") || ""}
                        onChange={(value) => setValue("phoneNumber", value)}
                        inputProps={{
                          name: "phoneNumber",
                          required: true,
                          className: `w-full px-5 py-3 rounded-xl border focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-sm font-medium transition-all duration-200 shadow-sm ${
                            errors.phoneNumber
                              ? "border-red-500"
                              : "border-gray-200 hover:border-teal-300"
                          }`,
                          placeholder: "Enter phone number",
                        }}
                      />
                      {errors.phoneNumber && (
                        <p className="mt-1 text-xs text-red-600 font-medium">
                          {errors.phoneNumber.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800 flex items-center">
                        <FiDollarSign className="mr-2 text-teal-600" />
                        Class Fee *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                          $
                        </span>
                        <input
                          {...register("classfee", {
                            required: "Class Fee is required",
                            valueAsNumber: true,
                            min: {
                              value: 0,
                              message: "Fee cannot be negative",
                            },
                          })}
                          className={`w-full pl-10 pr-5 py-3 rounded-xl border focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-sm font-medium transition-all duration-200 shadow-sm ${
                            errors.classfee
                              ? "border-red-500"
                              : "border-gray-200 hover:border-teal-300"
                          }`}
                          placeholder="Enter fee amount"
                          type="number"
                        />
                      </div>
                      {errors.classfee && (
                        <p className="mt-1 text-xs text-red-600 font-medium">
                          {errors.classfee.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800 flex items-center">
                        <FiCalendar className="mr-2 text-teal-600" />
                        Start Date *
                      </label>
                      <input
                        {...register("startdate", {
                          required: "Start Date is required",
                        })}
                        className={`w-full px-5 py-3 rounded-xl border focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-sm font-medium transition-all duration-200 shadow-sm ${
                          errors.startdate
                            ? "border-red-500"
                            : "border-gray-200 hover:border-teal-300"
                        }`}
                        type="date"
                      />
                      {errors.startdate && (
                        <p className="mt-1 text-xs text-red-600 font-medium">
                          {errors.startdate.message}
                        </p>
                      )}
                    </div>

                    {/* Region Package Dropdown */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800 flex items-center">
                        <FiFlag className="mr-2 text-teal-600" />
                        Package (Region) *
                      </label>
                      <select
                        {...register("package", {
                          required: "Region is required",
                        })}
                        className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-sm font-medium transition-all duration-200 shadow-sm hover:border-teal-300"
                      >
                        <option value="">Select package</option>
                        <option value="0 fee">0 fee</option>
                        <option value="3 days">3 days</option>
                        <option value="5 days">5 days</option>
                        <option value="europe">Europe</option>
                      </select>
                      {errors.package && (
                        <p className="mt-1 text-xs text-red-600 font-medium">
                          {errors.package.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800 flex items-center">
                        <FiUserCheck className="mr-2 text-teal-600" />
                        Status *
                      </label>
                      <select
                        {...register("status", {
                          required: "Status is required",
                          validate: (value) =>
                            [
                              "active",
                              "leave",
                              "remadan leave",
                              "notyet",
                              "fresh",
                            ].includes(value?.toLowerCase() || "") ||
                            "Status must be Active, Leave, Remadan leave, Notyet, or Fresh",
                        })}
                        className={`w-full px-5 py-3 rounded-xl border focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-sm font-medium transition-all duration-200 shadow-sm ${
                          errors.status
                            ? "border-red-500"
                            : "border-gray-200 hover:border-teal-300"
                        }`}
                      >
                        <option value="">Select status</option>
                        <option value="active">Active</option>
                        <option value="leave">Leave</option>
                        <option value="remadan leave">Remadan leave</option>
                        <option value="notyet">Notyet</option>
                        <option value="fresh">Fresh</option>
                      </select>
                      {errors.status && (
                        <p className="mt-1 text-xs text-red-600 font-medium">
                          {errors.status.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800 flex items-center">
                        <FiBook className="mr-2 text-teal-600" />
                        Subject *
                      </label>
                      <input
                        {...register("subject", {
                          required: "Subject is required",
                        })}
                        className={`w-full px-5 py-3 rounded-xl border focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-sm font-medium transition-all duration-200 shadow-sm ${
                          errors.subject
                            ? "border-red-500"
                            : "border-gray-200 hover:border-teal-300"
                        }`}
                        placeholder="Enter subject"
                      />
                      {errors.subject && (
                        <p className="mt-1 text-xs text-red-600 font-medium">
                          {errors.subject.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800 flex items-center">
                        <FiGlobe className="mr-2 text-teal-600" />
                        Country
                      </label>
                      <select
                        {...register("country")}
                        className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-sm font-medium transition-all duration-200 shadow-sm hover:border-teal-300"
                      >
                        <option value="">Select country</option>
                        {Object.keys(groupedCountries)
                          .sort()
                          .map((letter) => (
                            <optgroup key={letter} label={letter}>
                              {groupedCountries[letter]
                                .sort()
                                .map((country, index) => (
                                  <option key={index} value={country}>
                                    {country}
                                  </option>
                                ))}
                            </optgroup>
                          ))}
                      </select>
                    </div>

                    {/* Referral Dropdown for Registral */}
                    {session?.user?.role === "registral" && (
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-800 flex items-center">
                          <FiStar className="mr-2 text-teal-600" />
                          Refer (Controller)
                        </label>
                        {loadingControllers ? (
                          <div className="w-full px-5 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm">
                            Loading controllers...
                          </div>
                        ) : controllersError ? (
                          <div className="w-full px-5 py-3 rounded-xl border border-red-200 bg-red-50 text-red-500 text-sm">
                            {controllersError}
                          </div>
                        ) : controllers.length > 0 ? (
                          <select
                            {...register("refer", {
                              required:
                                "Please select a controller for referral",
                            })}
                            className={`w-full px-5 py-3 rounded-xl border focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-sm font-medium transition-all duration-200 shadow-sm ${
                              errors.refer
                                ? "border-red-500"
                                : "border-gray-200 hover:border-teal-300"
                            }`}
                            defaultValue=""
                          >
                            <option value="" disabled>
                              Select controller
                            </option>
                            {controllers.map((ctrl) => (
                              <option key={ctrl.username} value={ctrl.username}>
                                {ctrl.name} ({ctrl.username})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="w-full px-5 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm">
                            No controllers available
                          </div>
                        )}
                        {errors.refer && (
                          <p className="mt-1 text-xs text-red-600 font-medium">
                            {errors.refer.message}
                          </p>
                        )}
                      </div>
                    )}
                    {/* For other roles, hide or auto-fill refer field */}
                    {session?.user?.role !== "registral" && (
                      <input type="hidden" {...register("refer")} />
                    )}
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={`w-full py-4 px-8 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 mt-8 ${
                      isSubmitting
                        ? "bg-teal-400"
                        : "bg-teal-600 hover:bg-teal-700"
                    }`}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Processing...
                      </span>
                    ) : editId ? (
                      "Update Registration"
                    ) : (
                      "Complete Registration"
                    )}
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="mt-10 text-center text-xs text-gray-600 border-t border-gray-200 pt-8">
              <p className="font-medium">
                © 2025 Darulkubra Quran Academy. All rights reserved.
              </p>
              <p className="mt-2">
                Need help? Contact us at{" "}
                <a
                  href="mailto:support@darulkubra.com"
                  className="text-teal-600 hover:underline font-semibold"
                >
                  support@darulkubra.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
