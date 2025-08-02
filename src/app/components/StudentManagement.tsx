// import React, { useState } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import {
//   FiUser,
//   FiDollarSign,
//   FiCalendar,
//   FiSave,
//   FiX,
//   FiClock,
//   FiBook,
// } from "react-icons/fi";
// import toast from "react-hot-toast";

// interface Student {
//   id: number;
//   name: string;
//   phoneno: string;
//   classfee: number;
//   startdate: string;
//   control: string;
//   status: string;
//   ustaz: string;
//   package: string;
//   subject: string;
//   country: string;
//   rigistral: string;
//   daypackages: string;
//   isTrained: boolean;
//   refer: string;
//   registrationdate: string;
//   selectedTime: string;
//   teacher: {
//     ustazname: string;
//   };
// }

// interface StudentManagementProps {
//   student: Student;
//   onClose: () => void;
//   onUpdate: (updatedStudent: Student) => void;
// }

// type TabType = "info" | "fees" | "schedule";

// export default function StudentManagement({
//   student,
//   onClose,
//   onUpdate,
// }: StudentManagementProps) {
//   const [activeTab, setActiveTab] = useState<TabType>("info");
//   const [isLoading, setIsLoading] = useState(false);
//   const [formData, setFormData] = useState<Student>(student);

//   const handleInputChange = (
//     e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
//   ) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsLoading(true);

//     try {
//       const response = await fetch(`/api/students/${student.id}`, {
//         method: "PUT",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(formData),
//       });

//       if (!response.ok) {
//         throw new Error("Failed to update student");
//       }

//       const updatedStudent = await response.json();
//       onUpdate(updatedStudent);
//       toast.success("Student information updated successfully");
//     } catch (error) {
//       //       toast.error("Failed to update student information");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const tabs = [
//     { id: "info", label: "Basic Info", icon: FiUser },
//     { id: "fees", label: "Fees", icon: FiDollarSign },
//     { id: "schedule", label: "Schedule", icon: FiCalendar },
//   ];

//   return (
//     <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
//       <motion.div
//         initial={{ opacity: 0, scale: 0.95 }}
//         animate={{ opacity: 1, scale: 1 }}
//         exit={{ opacity: 0, scale: 0.95 }}
//         className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
//       >
//         <div className="p-6 border-b border-gray-200">
//           <div className="flex items-center justify-between mb-6">
//             <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
//               Manage Student
//             </h2>
//             <button
//               onClick={onClose}
//               className="p-2 text-gray-500 hover:text-gray-700 transition-colors rounded-full hover:bg-gray-100"
//             >
//               <FiX size={24} />
//             </button>
//           </div>

//           <div className="flex space-x-6 border-b border-gray-200">
//             {tabs.map((tab) => (
//               <button
//                 key={tab.id}
//                 onClick={() => setActiveTab(tab.id as TabType)}
//                 className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
//                   activeTab === tab.id
//                     ? "text-blue-600 border-b-2 border-blue-600"
//                     : "text-gray-500 hover:text-gray-700"
//                 }`}
//               >
//                 <tab.icon size={18} />
//                 <span>{tab.label}</span>
//               </button>
//             ))}
//           </div>
//         </div>

//         <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
//           <form onSubmit={handleSubmit}>
//             <AnimatePresence mode="wait">
//               {activeTab === "info" && (
//                 <motion.div
//                   key="info"
//                   initial={{ opacity: 0, x: -20 }}
//                   animate={{ opacity: 1, x: 0 }}
//                   exit={{ opacity: 0, x: 20 }}
//                   className="space-y-6"
//                 >
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Name
//                       </label>
//                       <input
//                         type="text"
//                         name="name"
//                         value={formData.name}
//                         onChange={handleInputChange}
//                         className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 shadow-sm"
//                       />
//                     </div>
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Phone Number
//                       </label>
//                       <input
//                         type="tel"
//                         name="phoneno"
//                         value={formData.phoneno}
//                         onChange={handleInputChange}
//                         className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 shadow-sm"
//                       />
//                     </div>
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Country
//                       </label>
//                       <input
//                         type="text"
//                         name="country"
//                         value={formData.country}
//                         onChange={handleInputChange}
//                         className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 shadow-sm"
//                       />
//                     </div>
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Status
//                       </label>
//                       <select
//                         name="status"
//                         value={formData.status}
//                         onChange={handleInputChange}
//                         className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 shadow-sm"
//                       >
//                         <option value="active">Active</option>
//                         <option value="pending">Pending</option>
//                         <option value="inactive">Inactive</option>
//                       </select>
//                     </div>
//                   </div>
//                 </motion.div>
//               )}

//               {activeTab === "fees" && (
//                 <motion.div
//                   key="fees"
//                   initial={{ opacity: 0, x: -20 }}
//                   animate={{ opacity: 1, x: 0 }}
//                   exit={{ opacity: 0, x: 20 }}
//                   className="space-y-6"
//                 >
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Class Fee
//                       </label>
//                       <div className="relative">
//                         <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
//                           $
//                         </span>
//                         <input
//                           type="number"
//                           name="classfee"
//                           value={formData.classfee}
//                           onChange={handleInputChange}
//                           className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 shadow-sm"
//                         />
//                       </div>
//                     </div>
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Package
//                       </label>
//                       <input
//                         type="text"
//                         name="package"
//                         value={formData.package}
//                         onChange={handleInputChange}
//                         className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 shadow-sm"
//                       />
//                     </div>
//                   </div>
//                 </motion.div>
//               )}

//               {activeTab === "schedule" && (
//                 <motion.div
//                   key="schedule"
//                   initial={{ opacity: 0, x: -20 }}
//                   animate={{ opacity: 1, x: 0 }}
//                   exit={{ opacity: 0, x: 20 }}
//                   className="space-y-6"
//                 >
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Time Slot
//                       </label>
//                       <input
//                         type="text"
//                         name="selectedTime"
//                         value={formData.selectedTime}
//                         onChange={handleInputChange}
//                         className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 shadow-sm"
//                       />
//                     </div>
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Days
//                       </label>
//                       <input
//                         type="text"
//                         name="daypackages"
//                         value={formData.daypackages}
//                         onChange={handleInputChange}
//                         className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 shadow-sm"
//                       />
//                     </div>
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Start Date
//                       </label>
//                       <input
//                         type="date"
//                         name="startdate"
//                         value={formData.startdate}
//                         onChange={handleInputChange}
//                         className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 shadow-sm"
//                       />
//                     </div>
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Teacher
//                       </label>
//                       <input
//                         type="text"
//                         name="ustaz"
//                         value={formData.ustaz}
//                         onChange={handleInputChange}
//                         className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-900 shadow-sm"
//                       />
//                     </div>
//                   </div>
//                 </motion.div>
//               )}
//             </AnimatePresence>

//             <div className="mt-8 flex justify-end space-x-4">
//               <button
//                 type="button"
//                 onClick={onClose}
//                 className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors shadow-sm"
//               >
//                 Cancel
//               </button>
//               <button
//                 type="submit"
//                 disabled={isLoading}
//                 className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
//               >
//                 {isLoading ? (
//                   <>
//                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
//                     <span>Saving...</span>
//                   </>
//                 ) : (
//                   <>
//                     <FiSave size={18} />
//                     <span>Save Changes</span>
//                   </>
//                 )}
//               </button>
//             </div>
//           </form>
//         </div>
//       </motion.div>
//     </div>
//   );
// }
