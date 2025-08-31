"use client";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
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
  FiClock,
  FiRefreshCw,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import Cookies from "js-cookie";
import { useSession } from "next-auth/react";
import { TimePicker } from "@/components/ui/TimePicker";
import {
  to24Hour,
  validateTime,
  fromDbFormat,
  getPrayerRanges,
} from "@/utils/timeUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  control?: { code: string }; // Made optional
  schedule?: string; // Added schedule field
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
    return "Invalid Time";
  }
};

function RegistrationContent() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const initialStep = parseInt(searchParams.get("step") || "1", 10);
  const [editTimeTeacher, setEditTimeTeacher] = useState(false);
  const { data: session, status } = useSession();

  const [step, setStep] = useState<number>(
    editId ? 3 : Math.min(Math.max(initialStep, 1), 3)
  );

  // Debug current step
  useEffect(() => {}, [step]);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [countries, setCountries] = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedTeacherSchedule, setSelectedTeacherSchedule] =
    useState<string>("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      daypackages: "All days",
      package: "",
    },
  });

  const selectedDayPackage = watch("daypackages");

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]); // Ensure initialized as empty array
  const [dayPackages] = useState<string[]>(["All days", "MWF", "TTS"]);

  const [error, setError] = useState<string | null>(null);
  const [editingTeacherName, setEditingTeacherName] = useState<string>("");

  const [availableTimeSlots, setAvailableTimeSlots] = useState<{
    [time: string]: boolean;
  }>({});
  const [loadingAvailability, setLoadingAvailability] =
    useState<boolean>(false);

  // Add state for controllers
  const [controllers, setControllers] = useState<
    { username: string; name: string; code: string }[]
  >([]);
  const [loadingControllers, setLoadingControllers] = useState(false);
  const [controllersError, setControllersError] = useState<string | null>(null);

  // --- ENHANCEMENT: Confirmation modal for unsaved changes ---
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<
    null | (() => void)
  >(null);
  const [formTouched, setFormTouched] = useState(false);

  // Mark form as touched on any change
  useEffect(() => {
    if (!formTouched) {
      const handler = () => setFormTouched(true);
      window.addEventListener("input", handler, true);
      return () => window.removeEventListener("input", handler, true);
    }
  }, [formTouched]);

  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (formTouched) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [formTouched]);

  const handleNavigateAway = (cb: () => void) => {
    if (formTouched) {
      setShowLeaveConfirm(true);
      setPendingNavigation(() => cb);
    } else {
      cb();
    }
  };

  const confirmLeave = () => {
    setShowLeaveConfirm(false);
    setFormTouched(false);
    if (pendingNavigation) pendingNavigation();
  };
  const cancelLeave = () => {
    setShowLeaveConfirm(false);
    setPendingNavigation(null);
  };

  // --- ENHANCEMENT: ARIA live region for error/success messages ---
  const [ariaMessage, setAriaMessage] = useState("");
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      setAriaMessage(
        "There are errors in the form. Please review and correct them."
      );
    }
  }, [errors]);

  useEffect(() => {
    const fetchCountries = async () => {
      setLoadingCountries(true);
      setFetchError(null);

      // Comprehensive fallback list
      const fallbackCountries = [
        "Afghanistan",
        "Albania",
        "Algeria",
        "Argentina",
        "Australia",
        "Austria",
        "Bangladesh",
        "Belgium",
        "Brazil",
        "Canada",
        "China",
        "Denmark",
        "Egypt",
        "Ethiopia",
        "Finland",
        "France",
        "Germany",
        "Ghana",
        "India",
        "Indonesia",
        "Iran",
        "Iraq",
        "Italy",
        "Japan",
        "Jordan",
        "Kenya",
        "Kuwait",
        "Lebanon",
        "Malaysia",
        "Morocco",
        "Netherlands",
        "Nigeria",
        "Norway",
        "Pakistan",
        "Philippines",
        "Qatar",
        "Russia",
        "Saudi Arabia",
        "Somalia",
        "South Africa",
        "Spain",
        "Sudan",
        "Sweden",
        "Switzerland",
        "Syria",
        "Turkey",
        "UAE",
        "UK",
        "USA",
        "Yemen",
      ];

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(
          "https://restcountries.com/v3.1/all?fields=name",
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: Country[] = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("Invalid API response format");
        }

        const countryNames = data
          .map((country) => country?.name?.common)
          .filter(Boolean)
          .sort();

        if (countryNames.length > 0) {
          setCountries(countryNames);
        } else {
          throw new Error("No valid country names found");
        }
      } catch (err) {
        console.warn("Countries API failed:", err);
        setFetchError("Using offline country list");
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
      // Log raw response to confirm
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
      setTeachers(
        (teacherData.teachers || []).filter(
          (t: Teacher) => t.control && t.control.code
        )
      );
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setTeachers([]);
    }
  }, [selectedTime, selectedDayPackage, selectedTeacher]);

  const fetchAllTeachers = useCallback(async () => {
    try {
      const response = await fetch("/api/teachers");
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch teachers: ${response.statusText}`);
      }
      const data = await response.json();
      setTeachers(data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setTeachers([]);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return; // Wait for session to load

    if (step === 2) {
      if ((session as any)?.role === "registral") {
        fetchAllTeachers();
      } else {
        fetchTeachers();
      }
    }
  }, [step, fetchTeachers, fetchAllTeachers, (session as any)?.role, status]);

  // Handle pre-filled data from US students
  const [isUsStudent, setIsUsStudent] = useState(false);

  useEffect(() => {
    const prefilled = searchParams.get("prefilled");
    const name = searchParams.get("name");
    const email = searchParams.get("email");
    const phoneno = searchParams.get("phoneno");
    const country = searchParams.get("country");
    const usStudentId = searchParams.get("usStudentId");

    if (prefilled === "true" && name) {
      setIsUsStudent(true);
      setValue("fullName", name);
      if (phoneno) setValue("phoneNumber", phoneno);
      // Set country to USA for US students (hidden field)
      setValue("country", "USA");
      // Set default class fee to null for US students
      setValue("classfee", null);
      // Store email and usStudentId for later use
      if (email) {
        sessionStorage.setItem("usStudentEmail", email);
      }
      if (usStudentId) {
        sessionStorage.setItem("usStudentId", usStudentId);
      }
    }
  }, [searchParams, setValue]);

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

          let fetchedSelectedTime = data.selectedTime || "";
          if (
            fetchedSelectedTime &&
            !/^\d{1,2}:\d{2}\s?(AM|PM)?$/.test(fetchedSelectedTime)
          ) {
            const [hour, minute] = fetchedSelectedTime.split(":").map(Number);
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
          setValue("daypackages", data.daypackages || "All days");
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

  // Update teacher schedule when teacher changes
  useEffect(() => {
    if (selectedTeacher) {
      const teacher = teachers.find((t) => t.ustazid === selectedTeacher);
      const schedule = teacher?.schedule || "";
      setSelectedTeacherSchedule(schedule);
    } else {
      setSelectedTeacherSchedule("");
    }
  }, [selectedTeacher, teachers]);

  // Add robust logging at the top of the Registration component
  useEffect(() => {}, [teachers, selectedTeacher, selectedTeacherSchedule]);

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
      const control = selectedUstaz?.control?.code || null;

      // Get US student data from session storage
      const usStudentEmail = sessionStorage.getItem("usStudentEmail");
      const usStudentId = sessionStorage.getItem("usStudentId");

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
        // Add US student data
        email: usStudentEmail || null,
        usStudentId: usStudentId ? parseInt(usStudentId) : null,
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
        setAriaMessage(
          errorData.message ||
            (editId ? "Update failed" : "Registration failed")
        );
        throw new Error(
          errorData.message ||
            (editId ? "Update failed" : "Registration failed")
        );
      }

      const result = await response.json();

      // US student is now automatically linked via userId field in registration
      setAriaMessage(
        result.message ||
          (editId
            ? "Registration updated successfully"
            : "Registration successful")
      );
      setSummaryData({
        name: data.fullName,
        phone: data.phoneNumber,
        time: selectedTime,
        teacher:
          teachers.find((t) => t.ustazid === selectedTeacher)?.ustazname ||
          editingTeacherName,
        package: data.package,
        daypackage: data.daypackages,
        status: data.status,
        subject: data.subject,
        country: data.country,
      });
      setShowSummary(true);
      setFormTouched(false);

      // Clean up session storage
      sessionStorage.removeItem("usStudentEmail");
      sessionStorage.removeItem("usStudentId");

      setTimeout(() => {
        if (usStudentId) {
          window.location.href = "/dashboard";
        } else {
          window.location.href = "/dashboard";
        }
      }, 1500);
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

  const checkAvailability = useCallback(async () => {
    if (!selectedDayPackage) return;
    setLoadingAvailability(true);
    const availability: { [time: string]: boolean } = {};

    await Promise.all(
      timeSlots.map(async (slot) => {
        try {
          const res = await fetch(
            `/api/teachers-by-time?selectedTime=${encodeURIComponent(
              slot.time
            )}&selectedDayPackage=${encodeURIComponent(
              selectedDayPackage
            )}&_t=${Date.now()}`
          );
          if (!res.ok) {
            availability[slot.time] = false;
            return;
          }
          const data = await res.json();
          const teachers = Array.isArray(data) ? data : data.teachers;
          const isAvailable = teachers && teachers.length > 0;
          availability[slot.time] = isAvailable;
        } catch (error) {
          availability[slot.time] = false;
        }
      })
    );

    setAvailableTimeSlots(availability);
    setLoadingAvailability(false);
  }, [timeSlots, selectedDayPackage]);

  useEffect(() => {
    if (timeSlots.length > 0 && selectedDayPackage) {
      checkAvailability();
    }
  }, [timeSlots, selectedDayPackage, checkAvailability]);

  // Refresh availability when returning from registration
  useEffect(() => {
    if (step === 1 && timeSlots.length > 0 && selectedDayPackage) {
      checkAvailability();
    }
  }, [step, checkAvailability, timeSlots.length, selectedDayPackage]);

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

  // --- ENHANCEMENT: Stepper clickable navigation ---
  const canGoToStep = (targetStep: number) => {
    if (targetStep === 1) return true;
    if (targetStep === 2) {
      return (
        (!editId || (editId && editTimeTeacher)) &&
        selectedTime &&
        selectedDayPackage
      );
    }
    if (targetStep === 3) {
      return (
        (!editId || (editId && editTimeTeacher)) &&
        selectedTeacher &&
        selectedTime &&
        selectedDayPackage
      );
    }
    return false;
  };

  // --- ENHANCEMENT: Auto-scroll to first error field on validation error ---
  const formRef = useRef<HTMLFormElement | null>(null);
  useEffect(() => {
    if (Object.keys(errors).length > 0 && formRef.current) {
      const firstErrorField = formRef.current.querySelector(
        ".border-red-500, [aria-invalid='true']"
      );
      if (
        firstErrorField &&
        typeof (firstErrorField as HTMLElement).scrollIntoView === "function"
      ) {
        (firstErrorField as HTMLElement).scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        (firstErrorField as HTMLElement).focus();
      }
    }
  }, [errors]);

  // --- ENHANCEMENT: Add ARIA labels and improve focus/active states ---
  // Add aria-labels to major sections and buttons, and add focus:ring classes to all major buttons/inputs
  // Example for a button:
  // className="... focus:outline-none focus:ring-2 focus:ring-teal-400 ..."
  // Example for a section:
  // <section aria-label="Student Details"> ... </section>
  // --- ENHANCEMENT: Ensure no horizontal scroll on small screens ---
  // Add overflow-x-hidden to main container and ensure all cards use w-full and max-w-full where appropriate

  // --- ENHANCEMENT: Keyboard navigation for major elements ---
  // Add tabIndex={0} and key handlers to stepper, teacher/time selection, etc.
  // Example for a stepper button:
  // <button
  //   type="button"
  //   aria-label={`Go to step ${i}`}
  //   disabled={step === i || !canGoToStep(i)}
  //   onClick={() => canGoToStep(i) && setStep(i)}
  //   className={`h-3 w-3 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-teal-400 ${
  //     step >= i ? "bg-teal-300 shadow-md" : "bg-white/40"
  //   } ${step === i ? "ring-2 ring-teal-500" : ""}`}
  //   style={{
  //     cursor: canGoToStep(i) ? "pointer" : "not-allowed",
  //   }}
  //   onKeyDown={(e) => {
  //     if (e.key === "Enter" || e.key === " ") {
  //       e.preventDefault();
  //       canGoToStep(i) && setStep(i);
  //     }
  //   }}
  //   tabIndex={step === i ? 0 : -1}
  // />
  // Example for a time slot button:
  // <motion.button
  //   key={slot.id}
  //   type="button"
  //   onClick={() => {
  //     if (availableTimeSlots[slot.time]) {
  //       setSelectedTime(slot.time);
  //       setStep(2);
  //     }
  //   }}
  //   disabled={!availableTimeSlots[slot.time]}
  //   whileHover={
  //     availableTimeSlots[slot.time]
  //       ? { scale: 1.03 }
  //       : {}
  //   }
  //   whileTap={
  //     availableTimeSlots[slot.time]
  //       ? { scale: 0.97 }
  //       : {}
  //   }
  //   className={`w-full text-left p-4 rounded-xl transition-all duration-200 text-sm font-semibold flex items-center shadow-sm ${
  //     selectedTime === slot.time
  //       ? "bg-teal-600 text-white shadow-md"
  //       : availableTimeSlots[slot.time]
  //       ? "bg-gray-50 text-gray-800 hover:bg-teal-50 border border-gray-200 hover:border-teal-300"
  //       : "bg-gray-200 text-gray-400 border border-gray-200 cursor-not-allowed"
  //   }`}
  //   title={
  //     availableTimeSlots[slot.time]
  //       ? ""
  //       : "No teacher available for this time and package"
  //   }
  //   onKeyDown={(e) => {
  //     if (e.key === "Enter" || e.key === " ") {
  //       e.preventDefault();
  //       if (availableTimeSlots[slot.time]) {
  //         setSelectedTime(slot.time);
  //         setStep(2);
  //       }
  //     }
  //   }}
  //   tabIndex={availableTimeSlots[slot.time] ? 0 : -1}
  // />

  // --- ENHANCEMENT: Show summary card and delay before redirect ---
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-teal-50 flex items-center justify-center p-4 md:p-8 font-sans overflow-x-hidden">
      {/* ARIA live region for error/success messages */}
      <div aria-live="polite" className="sr-only">
        {ariaMessage}
      </div>
      {/* Confirmation modal for unsaved changes */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="bg-gradient-to-br from-yellow-50 to-white border border-yellow-200 rounded-3xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center relative"
            style={{ fontFamily: "inherit" }}
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 border-4 border-yellow-200 mb-4 shadow">
              <svg
                className="w-8 h-8 text-yellow-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="#fef9c3"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 4h.01"
                />
              </svg>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-yellow-700 mb-2 tracking-tight">
              Unsaved Changes
            </h2>
            <p className="mb-6 text-gray-700 text-base md:text-lg text-center font-medium">
              You have unsaved changes. Are you sure you want to leave?
            </p>
            <div className="flex flex-col md:flex-row justify-end gap-4 w-full mt-2">
              <button
                onClick={cancelLeave}
                className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold text-base shadow focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all w-full md:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={confirmLeave}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold text-base shadow focus:outline-none focus:ring-2 focus:ring-red-400 transition-all w-full md:w-auto"
              >
                Leave
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Show summary card after registration/edit */}
      {showSummary && summaryData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative bg-white border-2 border-teal-200 rounded-3xl shadow-2xl p-10 max-w-md w-full flex flex-col items-center"
          >
            {/* Success Icon */}
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-teal-100 border-4 border-teal-200 mb-4 shadow-lg">
              <svg
                className="w-12 h-12 text-teal-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="#e0f2fe"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12l3 3 5-5"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold text-teal-700 mb-2 tracking-tight text-center">
              Registration Successful!
            </h2>
            <div className="space-y-2 text-gray-800 text-center text-lg font-medium mb-4">
              <div>
                <span className="font-semibold">Name:</span> {summaryData.name}
              </div>
              <div>
                <span className="font-semibold">Phone:</span>{" "}
                {summaryData.phone}
              </div>
              <div>
                <span className="font-semibold">Time Slot:</span>{" "}
                {summaryData.time}
              </div>
              <div>
                <span className="font-semibold">Teacher:</span>{" "}
                {summaryData.teacher}
              </div>
              <div>
                <span className="font-semibold">Package:</span>{" "}
                {summaryData.package}
              </div>
              <div>
                <span className="font-semibold">Day Package:</span>{" "}
                {summaryData.daypackage}
              </div>
              <div>
                <span className="font-semibold">Status:</span>{" "}
                {summaryData.status}
              </div>
              <div>
                <span className="font-semibold">Subject:</span>{" "}
                {summaryData.subject}
              </div>
              <div>
                <span className="font-semibold">Country:</span>{" "}
                {summaryData.country}
              </div>
            </div>
            {/* Progress bar for redirect */}
            <div className="w-full mt-4">
              <div className="h-2 rounded-full bg-teal-100 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.5, ease: "linear" }}
                  className="h-2 bg-gradient-to-r from-teal-400 to-blue-500 rounded-full"
                />
              </div>
              <div className="mt-3 text-teal-700 text-center font-semibold text-base tracking-wide animate-pulse">
                Redirecting to dashboard...
              </div>
            </div>
          </motion.div>
        </div>
      )}
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
              <div
                className="bg-white/10 backdrop-blur-sm rounded-full px-6 py-2 text-sm font-semibold flex items-center shadow-inner"
                aria-label="Step Progress"
              >
                <span className="mr-3">Step {step} of 3</span>
                <div className="flex space-x-1.5">
                  {[1, 2, 3].map((i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Go to step ${i}`}
                      disabled={step === i || !canGoToStep(i)}
                      onClick={() => canGoToStep(i) && setStep(i)}
                      className={`h-3 w-3 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-teal-400 ${
                        step >= i ? "bg-teal-300 shadow-md" : "bg-white/40"
                      } ${step === i ? "ring-2 ring-teal-500" : ""}`}
                      style={{
                        cursor: canGoToStep(i) ? "pointer" : "not-allowed",
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          canGoToStep(i) && setStep(i);
                        }
                      }}
                      tabIndex={step === i ? 0 : -1}
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
              {/* Step 1: Day package and time slot selection (no TimePicker, no teacher selection) */}
              {step === 1 && (
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
                  {/* Time slot grid */}
                  {(() => {
                    return timeSlots.length > 0;
                  })() && (
                    <>
                      {/* Debug info */}
                      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-800 font-medium">Debug Info:</p>
                        <p className="text-blue-600 text-sm">
                          Time slots count: {timeSlots.length}
                        </p>
                        <p className="text-blue-600 text-sm">
                          Categories: {Object.keys(groupedTimeSlots).join(", ")}
                        </p>
                        <p className="text-blue-600 text-sm">
                          Selected day package: {selectedDayPackage}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {Object.keys(groupedTimeSlots).map((category) => {
                          const prayerRanges = getPrayerRanges();
                          const categoryInfo = prayerRanges[category];

                          return (
                            <div
                              key={category}
                              className="bg-white rounded-2xl p-5 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100"
                            >
                              <h3 className="text-xl font-semibold text-teal-600 mb-2 flex items-center">
                                <span className="w-4 h-4 bg-teal-500 rounded-full mr-3 shadow-sm"></span>
                                {category}
                              </h3>
                              {categoryInfo && (
                                <p className="text-sm text-gray-600 mb-4 font-medium">
                                  {categoryInfo.range} -{" "}
                                  {categoryInfo.description}
                                </p>
                              )}
                              <div className="space-y-3">
                                {groupedTimeSlots[category].map((slot) => {
                                  const isAvailable =
                                    availableTimeSlots[slot.time];
                                  const isSelected = selectedTime === slot.time;
                                  const isLoading = loadingAvailability;

                                  return (
                                    <motion.button
                                      key={slot.id}
                                      type="button"
                                      onClick={() => {
                                        if (isAvailable && !isLoading) {
                                          setSelectedTime(slot.time);
                                        }
                                      }}
                                      disabled={!isAvailable || isLoading}
                                      whileHover={
                                        isAvailable && !isLoading
                                          ? { scale: 1.03 }
                                          : {}
                                      }
                                      whileTap={
                                        isAvailable && !isLoading
                                          ? { scale: 0.97 }
                                          : {}
                                      }
                                      className={`w-full text-left p-4 rounded-xl transition-all duration-200 text-sm font-semibold flex flex-col shadow-sm relative ${
                                        isSelected
                                          ? "bg-teal-600 text-white shadow-md"
                                          : isLoading
                                          ? "bg-gray-100 text-gray-500 border border-gray-200 cursor-wait"
                                          : isAvailable
                                          ? "bg-white text-gray-800 hover:bg-green-50 border-2 border-green-500 hover:border-green-600"
                                          : "bg-red-50 text-red-800 border-2 border-red-500 cursor-not-allowed opacity-75"
                                      }`}
                                      title={
                                        isLoading
                                          ? "Checking availability..."
                                          : isAvailable
                                          ? "Click to select this time slot"
                                          : "No teacher available for this time and package"
                                      }
                                    >
                                      {/* Availability indicator circle */}
                                      <div
                                        className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                                          isLoading
                                            ? "bg-gray-400 animate-pulse"
                                            : isAvailable
                                            ? "bg-green-500"
                                            : "bg-red-500"
                                        }`}
                                      />

                                      <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                          <span className="text-lg font-bold">
                                            {convertTo12Hour(slot.time)}
                                          </span>
                                          <span className="text-xs opacity-75">
                                            {slot.time} (24hr)
                                          </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          {isLoading ? (
                                            <Badge className="bg-gray-100 text-gray-600 text-xs">
                                              Checking...
                                            </Badge>
                                          ) : isAvailable ? (
                                            <Badge className="bg-green-100 text-green-800 text-xs font-bold">
                                              ✓ Available
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-red-100 text-red-800 text-xs font-bold">
                                              ✗ Full
                                            </Badge>
                                          )}
                                          <FiArrowRight
                                            className={`ml-2 ${
                                              isSelected
                                                ? "text-white"
                                                : isLoading
                                                ? "text-gray-400"
                                                : isAvailable
                                                ? "text-green-600"
                                                : "text-red-400"
                                            }`}
                                          />
                                        </div>
                                      </div>
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Summary of availability */}
                      <div className="mt-6 bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                          <FiInfo className="mr-2 text-teal-600" />
                          Time Slot Availability Summary
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {
                                Object.values(availableTimeSlots).filter(
                                  (v) => v
                                ).length
                              }
                            </div>
                            <div className="text-sm text-gray-600">
                              Available
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                              {
                                Object.values(availableTimeSlots).filter(
                                  (v) => !v
                                ).length
                              }
                            </div>
                            <div className="text-sm text-gray-600">
                              Unavailable
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {Object.keys(groupedTimeSlots).length}
                            </div>
                            <div className="text-sm text-gray-600">
                              Categories
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-600">
                              {timeSlots.length}
                            </div>
                            <div className="text-sm text-gray-600">
                              Total Slots
                            </div>
                          </div>
                        </div>
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

                  {/* Loading state */}
                  {timeSlots.length === 0 && !loadingAvailability && (
                    <div className="text-center py-8">
                      <div className="bg-gray-50 border-l-4 border-gray-400 p-6 rounded-xl inline-block shadow-sm">
                        <p className="text-gray-700 font-medium text-lg">
                          No time slots available. Please contact admin to add
                          teacher schedules.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-4 mt-4">
                    <Button
                      onClick={() => checkAvailability()}
                      disabled={loadingAvailability}
                      // variant="outline"
                      className="flex items-center gap-2"
                    >
                      <FiRefreshCw
                        className={`h-4 w-4 ${
                          loadingAvailability ? "animate-spin" : ""
                        }`}
                      />
                      Refresh Availability
                    </Button>
                    <Button
                      onClick={() => setStep(2)}
                      disabled={!selectedDayPackage || !selectedTime}
                    >
                      Continue
                    </Button>
                  </div>
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

              {/* Step 2: Teacher selection (filtered by selected time and package) */}
              {step === 2 && (
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
                                {teacher.control?.code || "Unknown"})
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
                      disabled={!selectedTeacher}
                      whileHover={selectedTeacher ? { scale: 1.03 } : {}}
                      whileTap={selectedTeacher ? { scale: 0.97 } : {}}
                      className={`px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 flex items-center ${
                        !selectedTeacher
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

                    {!isUsStudent && (
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
                              required: !isUsStudent
                                ? "Class Fee is required"
                                : false,
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
                    )}

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
                        <option value="0 Fee">0 Fee</option>
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
                              "not yet",
                              "fresh",
                              "not succeed",
                              "completed",
                            ].includes(value?.toLowerCase() || "") ||
                            "Status must be Active, Leave, Remadan leave, Not yet, Fresh, Not Succeed, or Completed",
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
                        <option value="Not yet">Not yet</option>
                        <option value="fresh">Fresh</option>
                        <option value="Not Succeed">Not Succeed</option>
                        <option value="Completed">Completed</option>
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
                      <select
                        {...register("subject", {
                          required: "Subject is required",
                        })}
                        className={`w-full px-5 py-3 rounded-xl border focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-sm font-medium transition-all duration-200 shadow-sm ${
                          errors.subject
                            ? "border-red-500"
                            : "border-gray-200 hover:border-teal-300"
                        }`}
                      >
                        <option value="">Select subject</option>
                        <option value="Qaidah">Qaidah</option>
                        <option value="Nethor">Nethor</option>
                        <option value="Hifz">Hifz</option>
                        <option value="Kitab">Kitab</option>
                      </select>
                      {errors.subject && (
                        <p className="mt-1 text-xs text-red-600 font-medium">
                          {errors.subject.message}
                        </p>
                      )}
                    </div>

                    {!isUsStudent && (
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
                    )}
                    {/* Hidden country field for US students */}
                    {isUsStudent && (
                      <input
                        type="hidden"
                        {...register("country")}
                        value="USA"
                      />
                    )}

                    {/* Referral Dropdown for Registral */}
                    {session?.user?.role === "registral" && (
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-800 flex items-center">
                          <FiStar className="mr-2 text-teal-600" />
                          Refer (Controller) - Optional
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
                            {...register("refer")}
                            className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-sm font-medium transition-all duration-200 shadow-sm hover:border-teal-300"
                            defaultValue=""
                          >
                            <option value="">
                              Select controller (optional)
                            </option>
                            {controllers.map((ctrl) => (
                              <option key={ctrl.code} value={ctrl.code}>
                                {ctrl.name} ({ctrl.code})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="w-full px-5 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm">
                            No controllers available
                          </div>
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

export default function Registration() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegistrationContent />
    </Suspense>
  );
}
