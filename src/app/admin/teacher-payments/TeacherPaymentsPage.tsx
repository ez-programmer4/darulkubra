"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dayjs from "dayjs";
import { useToast } from "@/components/ui/use-toast";
import { TeacherPayment, TeacherBreakdown, BulkAction, PackageSalary } from "./types";

// Helper function to sort data with proper typing
const sortData = <T extends Record<string, any>>(
  data: T[], 
  key: keyof T,
  direction: 'asc' | 'desc' = 'asc'
): T[] => {
  if (!key) return [...data];
  
  return [...data].sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];
    
    if (aValue === bValue) return 0;
    if (aValue == null) return direction === 'asc' ? 1 : -1;
    if (bValue == null) return direction === 'asc' ? -1 : 1;
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return direction === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return direction === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });
};

export default function TeacherPaymentsPage() {
  const { toast } = useToast();
  
  // Date and filter states
  const [selectedMonth, setSelectedMonth] = useState<number>(dayjs().month() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(dayjs().year());
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // UI states
  const [showReportOptions, setShowReportOptions] = useState<boolean>(false);
  const [showAdvancedView, setShowAdvancedView] = useState<boolean>(false);
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState<boolean>(false);
  
  // Selection states
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set());
  
  // Payment processing states
  const [paymentProcessing, setPaymentProcessing] = useState<Set<string>>(new Set());
  const [paymentResults, setPaymentResults] = useState<Record<string, any>>({});
  
  // Package salary states
  const [packageSalaryLoading, setPackageSalaryLoading] = useState<boolean>(false);
  const [packageSalaryError, setPackageSalaryError] = useState<string | null>(null);
  const [packageSalarySuccess, setPackageSalarySuccess] = useState<string | null>(null);
  const [packageSalaries, setPackageSalaries] = useState<PackageSalary[]>([]);
  const [packageSalaryInputs, setPackageSalaryInputs] = useState<Record<string, string>>({});
  
  // Breakdown states
  const [breakdown, setBreakdown] = useState<TeacherBreakdown | null>(null);
  const [showBreakdown, setShowBreakdown] = useState<boolean>(false);
  const [breakdownLoading, setBreakdownLoading] = useState<boolean>(false);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);
  
  // Data states
  const [teachers, setTeachers] = useState<TeacherPayment[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherPayment | null>(null);
  const [availablePackages, setAvailablePackages] = useState<string[]>([]);
  
  // Bulk action state
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  
  // Sorting state
  const [sortKey, setSortKey] = useState<keyof TeacherPayment>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  
  // Sort data based on current sort key and direction
  const sortedData = useMemo(() => {
    return sortData<TeacherPayment>(teachers, sortKey, sortDir);
  }, [teachers, sortKey, sortDir]);

  // Update teacher data with package breakdowns
  const updateTeacherWithPackageBreakdown = useCallback((teacherId: string, data: TeacherBreakdown) => {
    setTeachers(prevTeachers => 
      prevTeachers.map(teacher => {
        if (teacher.id === teacherId) {
          return {
            ...teacher,
            packageName: data.packageName || teacher.packageName,
            packageSalary: data.baseSalary,
            baseSalary: data.baseSalary,
            latenessDeduction: data.totalLatenessDeduction || 0,
            absenceDeduction: data.totalAbsenceDeduction || 0,
            bonuses: data.totalBonuses || 0,
            totalSalary: data.netSalary || 0,
            paymentData: {
              latenessRecords: data.latenessRecords || [],
              absenceRecords: data.absenceRecords || [],
              bonusRecords: data.bonusRecords || [],
            },
            status: data.error ? 'Error' : 'Unpaid',
            error: data.error,
          };
        }
        return teacher;
      })
    );
  }, []);

  // Fetch breakdown for a specific teacher
  const fetchBreakdown = useCallback(async (teacherId: string) => {
    setBreakdownLoading(true);
    setBreakdownError(null);
    
    try {
      const response = await fetch(
        `/api/teacher-payments/breakdown?teacherId=${teacherId}&month=${selectedMonth}&year=${selectedYear}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch breakdown');
      }
      
      const data = await response.json();
      setBreakdown(data);
      updateTeacherWithPackageBreakdown(teacherId, data);
      
    } catch (error) {
      console.error('Error fetching breakdown:', error);
      setBreakdownError(error instanceof Error ? error.message : 'Failed to fetch breakdown');
      toast({
        title: 'Error',
        description: 'Failed to fetch payment breakdown',
        variant: 'destructive',
      });
    } finally {
      setBreakdownLoading(false);
    }
  }, [selectedMonth, selectedYear, toast, updateTeacherWithPackageBreakdown]);

  // Export to CSV helper function
  const exportToCSV = useCallback((data: TeacherPayment[], filename: string) => {
    try {
      const headers = [
        'Teacher Name',
        'Base Salary',
        'Lateness Deduction',
        'Absence Deduction',
        'Bonuses',
        'Total Salary',
        'Status'
      ];

      const csvContent = [
        headers.join(','),
        ...data.map(teacher => [
          `"${teacher.name?.replace(/"/g, '""') || ''}"`,
          teacher.baseSalary,
          teacher.latenessDeduction,
          teacher.absenceDeduction,
          teacher.bonuses,
          teacher.totalSalary,
          teacher.status || 'Unpaid'
        ].map(field => String(field).replace(/,/g, ';'))
        .join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast({
        title: 'Error',
        description: 'Failed to export data to CSV',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Handle bulk action selection
  const handleBulkAction = useCallback((action: BulkAction | '') => {
    if (!action) return;
    
    if (action === 'export') {
      exportToCSV(teachers, `teacher_payments_${selectedMonth}_${selectedYear}`);
    } else if (action === 'mark_paid' || action === 'mark_unpaid') {
      setBulkAction(action);
      setShowBulkConfirm(true);
    }
  }, [exportToCSV, selectedMonth, selectedYear, teachers]);

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  // Handle bulk action confirmation
  const handleBulkActionConfirm = useCallback(async () => {
    if (!bulkAction) return;
    
    try {
      setBulkLoading(true);
      
      // Process each selected teacher
      for (const teacherId of selectedTeachers) {
        const teacher = teachers.find(t => t.id === teacherId);
        if (teacher) {
          try {
            // Implement your payment processing logic here
            // await processPayment(teacherId, teacher);
          } catch (error) {
            console.error(`Error processing payment for teacher ${teacherId}:`, error);
          }
        }
      }
      
      // Reset selection and close confirmation
      setSelectedTeachers(new Set());
      setShowBulkConfirm(false);
      setBulkAction(null);
      
      toast({
        title: 'Success',
        description: `Successfully processed ${selectedTeachers.size} teachers`,
        variant: 'default',
      });
      
    } catch (error) {
      console.error('Error processing bulk action:', error);
      toast({
        title: 'Error',
        description: 'Failed to process bulk action',
        variant: 'destructive',
      });
    } finally {
      setBulkLoading(false);
    }
  }, [bulkAction, selectedTeachers, teachers, toast]);

  // Fetch teachers data
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        // Implement your teachers data fetching logic here
        // const response = await fetch('/api/teachers');
        // const data = await response.json();
        // setTeachers(data);
      } catch (error) {
        console.error('Error fetching teachers:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch teachers',
          variant: 'destructive',
        });
      }
    };

    fetchTeachers();
  }, [toast]);

  // Render the component
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Teacher Payments</h1>
      
      {/* Filters and controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Search teachers..."
            />
          </div>
          
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <option key={month} value={month}>
                  {new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          
          <div className="w-24">
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          
          <div className="flex items-end gap-2">
            <button
              onClick={() => setShowAdvancedView(!showAdvancedView)}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              {showAdvancedView ? 'Hide Advanced' : 'Show Advanced'}
            </button>
          </div>
        </div>
        
        {/* Bulk actions */}
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center gap-2">
            <select
              value=""
              onChange={(e) => handleBulkAction(e.target.value as BulkAction | '')}
              className="p-2 border rounded-md"
              disabled={selectedTeachers.size === 0}
            >
              <option value="">Bulk Actions</option>
              <option value="mark_paid">Mark as Paid</option>
              <option value="mark_unpaid">Mark as Unpaid</option>
              <option value="export">Export</option>
            </select>
            
            {selectedTeachers.size > 0 && (
              <span className="text-sm text-gray-600">
                {selectedTeachers.size} selected
              </span>
            )}
          </div>
          
          <button
            onClick={() => setShowReportOptions(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Generate Report
          </button>
        </div>
      </div>
      
      {/* Teachers table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selectedTeachers.size === teachers.length && teachers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTeachers(new Set(teachers.map(t => t.id)));
                      } else {
                        setSelectedTeachers(new Set());
                      }
                    }}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teacher
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Package
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deductions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bonuses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={selectedTeachers.has(teacher.id)}
                      onChange={(e) => {
                        const newSelection = new Set(selectedTeachers);
                        if (e.target.checked) {
                          newSelection.add(teacher.id);
                        } else {
                          newSelection.delete(teacher.id);
                        }
                        setSelectedTeachers(newSelection);
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {teacher.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                        <div className="text-sm text-gray-500">{teacher.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {teacher.packageName || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${teacher.baseSalary.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    -${(teacher.latenessDeduction + teacher.absenceDeduction).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    +${teacher.bonuses.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    ${teacher.totalSalary.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      teacher.status === 'Paid' 
                        ? 'bg-green-100 text-green-800' 
                        : teacher.status === 'Error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {teacher.status || 'Unpaid'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedTeacher(teacher);
                        setShowBreakdown(true);
                        fetchBreakdown(teacher.id);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      View
                    </button>
                    <button
                      onClick={() => {
                        // Implement edit functionality
                      }}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              
              {teachers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                    No teachers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to{' '}
                <span className="font-medium">10</span> of{' '}
                <span className="font-medium">20</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <span className="sr-only">Previous</span>
                  &larr;
                </button>
                {[1, 2, 3, 4, 5].map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === page
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <span className="sr-only">Next</span>
                  &rarr;
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
      
      {/* Breakdown Modal */}
      {showBreakdown && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Payment Breakdown - {selectedTeacher.name}
              </h3>
              <button
                onClick={() => setShowBreakdown(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                &times;
              </button>
            </div>
            
            {breakdownLoading ? (
              <div className="p-6 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : breakdownError ? (
              <div className="p-6 text-red-600">
                <p>Error loading breakdown: {breakdownError}</p>
              </div>
            ) : breakdown ? (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Base Salary</h4>
                    <p className="text-2xl font-semibold">${breakdown.baseSalary.toFixed(2)}</p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Total Deductions</h4>
                    <p className="text-2xl font-semibold text-red-600">
                      -${(breakdown.totalLatenessDeduction + breakdown.totalAbsenceDeduction).toFixed(2)}
                    </p>
                    <div className="text-sm text-gray-500 mt-1">
                      <span>Lateness: -${breakdown.totalLatenessDeduction.toFixed(2)}</span>
                      <span className="mx-2">•</span>
                      <span>Absence: -${breakdown.totalAbsenceDeduction.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Total Bonuses</h4>
                    <p className="text-2xl font-semibold text-green-600">
                      +${breakdown.totalBonuses.toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="text-sm font-medium text-blue-700 mb-2">Net Salary</h4>
                    <p className="text-3xl font-bold text-blue-800">
                      ${breakdown.netSalary.toFixed(2)}
                    </p>
                  </div>
                </div>
                
                {/* Detailed breakdown sections */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Lateness Records</h4>
                  {breakdown.latenessRecords.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Minutes Late
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Deduction
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {breakdown.latenessRecords.map((record, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(record.date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {record.minutesLate} min
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                                -${record.deduction?.toFixed(2) || '0.00'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No lateness records found</p>
                  )}
                </div>
                
                <div className="mt-8">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Absence Records</h4>
                  {breakdown.absenceRecords.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Deduction
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {breakdown.absenceRecords.map((record, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(record.date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {record.type}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                                -${record.deduction?.toFixed(2) || '0.00'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No absence records found</p>
                  )}
                </div>
                
                <div className="mt-8">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Bonus Records</h4>
                  {breakdown.bonusRecords.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {breakdown.bonusRecords.map((record, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(record.date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {record.description}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                                +${record.amount?.toFixed(2) || '0.00'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No bonus records found</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-gray-500">
                No breakdown data available
              </div>
            )}
            
            <div className="px-6 py-4 border-t flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowBreakdown(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedTeacher) {
                    exportToCSV([selectedTeacher], `${selectedTeacher.name.replace(/\s+/g, '_')}_payment_breakdown`);
                  }
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Export to CSV
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Bulk Action Confirmation Modal */}
      {showBulkConfirm && bulkAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Confirm {bulkAction === 'mark_paid' ? 'Mark as Paid' : 'Mark as Unpaid'}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to {bulkAction === 'mark_paid' ? 'mark' : 'unmark'} {selectedTeachers.size} selected teacher(s) as {bulkAction === 'mark_paid' ? 'paid' : 'unpaid'}?
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setBulkAction(null);
                    setShowBulkConfirm(false);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={bulkLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkActionConfirm}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={bulkLoading}
                >
                  {bulkLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    `Confirm ${bulkAction === 'mark_paid' ? 'Paid' : 'Unpaid'}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
