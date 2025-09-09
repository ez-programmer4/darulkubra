import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { startDate, endDate, teachersData, includeDetails = false } = await req.json();
    
    const fromDate = new Date(startDate);
    const toDate = new Date(endDate);
    const monthYear = fromDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Calculate totals
    const totalTeachers = teachersData.length;
    const totalBaseSalary = teachersData.reduce((sum: number, t: any) => sum + t.baseSalary, 0);
    const totalLatenessDeduction = teachersData.reduce((sum: number, t: any) => sum + t.latenessDeduction, 0);
    const totalAbsenceDeduction = teachersData.reduce((sum: number, t: any) => sum + t.absenceDeduction, 0);
    const totalBonuses = teachersData.reduce((sum: number, t: any) => sum + t.bonuses, 0);
    const totalSalary = teachersData.reduce((sum: number, t: any) => sum + t.totalSalary, 0);
    const totalStudents = teachersData.reduce((sum: number, t: any) => sum + (t.numStudents || 0), 0);

    // Fetch detailed breakdown for each teacher if requested
    let detailedData = teachersData;
    if (includeDetails) {
      const { prisma } = require("@/lib/prisma");
      
      detailedData = await Promise.all(teachersData.map(async (teacher: any) => {
        try {
          // Fetch detailed breakdown
          const breakdownRes = await fetch(`${req.nextUrl.origin}/api/admin/teacher-payments?teacherId=${teacher.id}&from=${startDate}&to=${endDate}`);
          const breakdown = breakdownRes.ok ? await breakdownRes.json() : { latenessRecords: [], absenceRecords: [], bonusRecords: [] };
          
          // Fetch student package breakdown with daily data
          const month = fromDate.getMonth() + 1;
          const year = fromDate.getFullYear();
          const studentsRes = await fetch(`${req.nextUrl.origin}/api/admin/teacher-students/${teacher.id}?month=${month}&year=${year}`);
          const studentData = studentsRes.ok ? await studentsRes.json() : null;
          
          return {
            ...teacher,
            breakdown,
            studentData
          };
        } catch (error) {
          return teacher;
        }
      }));
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${includeDetails ? 'Detailed ' : ''}Teacher Payment Report - ${monthYear}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background: #f8f9fa;
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px; 
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
        }
        .header h1 { 
            font-size: 2.5em; 
            margin-bottom: 10px; 
            font-weight: 700;
        }
        .header p { 
            font-size: 1.2em; 
            opacity: 0.9;
        }
        .summary { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
        }
        .summary-card { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 10px; 
            text-align: center;
            border-left: 4px solid #667eea;
        }
        .summary-card h3 { 
            color: #667eea; 
            font-size: 0.9em; 
            text-transform: uppercase; 
            margin-bottom: 10px;
            font-weight: 600;
        }
        .summary-card .value { 
            font-size: 1.8em; 
            font-weight: bold; 
            color: #333;
        }
        .table-container { 
            overflow-x: auto; 
            margin-bottom: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            background: white;
        }
        th, td { 
            padding: 12px; 
            text-align: left; 
            border-bottom: 1px solid #e9ecef;
        }
        th { 
            background: #667eea; 
            color: white; 
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.85em;
            letter-spacing: 0.5px;
        }
        tr:hover { 
            background: #f8f9fa; 
        }
        .number { 
            text-align: right; 
            font-family: 'Courier New', monospace;
            font-weight: 600;
        }
        .positive { color: #28a745; }
        .negative { color: #dc3545; }
        .neutral { color: #6c757d; }
        .footer { 
            text-align: center; 
            margin-top: 30px; 
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            color: #6c757d;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.75em;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge-students { background: #e3f2fd; color: #1976d2; }
        .badge-deduction { background: #ffebee; color: #d32f2f; }
        .badge-bonus { background: #e8f5e8; color: #388e3c; }
        @media print {
            body { background: white; }
            .container { box-shadow: none; }
            .no-print { display: none; }
        }
        .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            transition: all 0.3s ease;
        }
        .print-btn:hover {
            background: #5a6fd8;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        .details-section {
            margin-top: 20px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        .breakdown-item {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            margin: 15px 0;
            padding: 20px;
            border-radius: 12px;
            border-left: 4px solid #28a745;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            transition: all 0.3s ease;
        }
        .breakdown-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.12);
        }
        .breakdown-item.deduction {
            border-left-color: #dc3545;
            background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 20%, #ffffff 100%);
        }
        .breakdown-item.bonus {
            border-left-color: #ffc107;
            background: linear-gradient(135deg, #fffbf0 0%, #fef5e7 20%, #ffffff 100%);
        }
        .breakdown-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e9ecef;
        }
        .breakdown-title {
            font-size: 1.2em;
            font-weight: bold;
            color: #2c3e50;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .breakdown-total {
            background: #667eea;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.9em;
        }
        .record-item {
            background: #ffffff;
            margin: 8px 0;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e9ecef;
            transition: all 0.2s ease;
        }
        .record-item:hover {
            background: #f8f9fa;
            border-color: #667eea;
        }
        .record-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .record-date {
            font-weight: bold;
            color: #495057;
            font-size: 0.95em;
        }
        .record-amount {
            background: #dc3545;
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-weight: bold;
            font-size: 0.85em;
        }
        .record-details {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 10px;
        }
        .detail-badge {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.75em;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge-lateness { background: #fff3cd; color: #856404; }
        .badge-tier { background: #cce5ff; color: #004085; }
        .badge-student { background: #d4edda; color: #155724; }
        .badge-permitted { background: #d1ecf1; color: #0c5460; }
        .badge-unpermitted { background: #f8d7da; color: #721c24; }
        .calculation-box {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 12px;
            margin-top: 10px;
            font-family: 'Courier New', monospace;
            font-size: 0.85em;
        }
        .time-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 8px;
            font-size: 0.8em;
            color: #6c757d;
        }
        .package-breakdown {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin: 15px 0;
        }
        .package-card {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #dee2e6;
            transition: all 0.2s ease;
        }
        .package-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transform: translateY(-2px);
        }
        .daily-summary {
            background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%);
            padding: 20px;
            border-radius: 12px;
            margin: 15px 0;
            border: 2px solid #28a745;
        }
        .daily-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
            text-align: center;
        }
        .daily-stat {
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .daily-stat-value {
            font-size: 1.5em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .daily-stat-label {
            font-size: 0.8em;
            color: #6c757d;
            text-transform: uppercase;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <button class="print-btn no-print" onclick="window.print()">🖨️ Print Report</button>
    
    <div class="container">
        <div class="header">
            <h1>📊 ${includeDetails ? 'Detailed ' : ''}Teacher Payment Report</h1>
            <p>${monthYear} • Generated on ${new Date().toLocaleDateString()}</p>
            ${includeDetails ? '<p style="font-size: 0.9em; opacity: 0.8;">📋 Includes comprehensive breakdown of all deductions, bonuses, and package details</p>' : ''}
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>👥 Total Teachers</h3>
                <div class="value">${totalTeachers}</div>
            </div>
            <div class="summary-card">
                <h3>🎓 Total Students</h3>
                <div class="value">${totalStudents}</div>
            </div>
            <div class="summary-card">
                <h3>💰 Base Salary</h3>
                <div class="value">${totalBaseSalary.toLocaleString()} ETB</div>
            </div>
            <div class="summary-card">
                <h3>⚠️ Total Deductions</h3>
                <div class="value negative">${(totalLatenessDeduction + totalAbsenceDeduction).toLocaleString()} ETB</div>
            </div>
            <div class="summary-card">
                <h3>🏆 Total Bonuses</h3>
                <div class="value positive">${totalBonuses.toLocaleString()} ETB</div>
            </div>
            <div class="summary-card">
                <h3>💵 Net Total</h3>
                <div class="value">${totalSalary.toLocaleString()} ETB</div>
            </div>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Teacher Name</th>
                        <th>Students</th>
                        <th>Base Salary</th>
                        <th>Lateness Deduction</th>
                        <th>Absence Deduction</th>
                        <th>Bonuses</th>
                        <th>Net Salary</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${detailedData.map((teacher: any) => `
                        <tr>
                            <td><strong>${teacher.name}</strong></td>
                            <td class="number">
                                <span class="badge badge-students">${teacher.numStudents || 0}</span>
                            </td>
                            <td class="number">${teacher.baseSalary.toLocaleString()} ETB</td>
                            <td class="number">
                                ${teacher.latenessDeduction > 0 
                                    ? `<span class="badge badge-deduction">-${teacher.latenessDeduction.toLocaleString()} ETB</span>`
                                    : '<span class="neutral">No deductions</span>'
                                }
                            </td>
                            <td class="number">
                                ${teacher.absenceDeduction > 0 
                                    ? `<span class="badge badge-deduction">-${teacher.absenceDeduction.toLocaleString()} ETB</span>`
                                    : '<span class="neutral">No absences</span>'
                                }
                            </td>
                            <td class="number">
                                ${teacher.bonuses > 0 
                                    ? `<span class="badge badge-bonus">+${teacher.bonuses.toLocaleString()} ETB</span>`
                                    : '<span class="neutral">No bonuses</span>'
                                }
                            </td>
                            <td class="number"><strong>${teacher.totalSalary.toLocaleString()} ETB</strong></td>
                            <td class="number">
                                <span class="badge ${teacher.status === 'Paid' ? 'badge-bonus' : 'badge-deduction'}">
                                    ${teacher.status || 'Unpaid'}
                                </span>
                            </td>
                        </tr>
                        ${includeDetails && teacher.breakdown ? `
                        <tr>
                            <td colspan="8">
                                <div class="details-section">
                                    <h4>📋 Detailed Breakdown for ${teacher.name}</h4>
                                    
                                    ${teacher.studentData?.packageBreakdown ? `
                                    <div class="breakdown-item">
                                        <div class="breakdown-header">
                                            <div class="breakdown-title">
                                                📅 Daily Attendance Payment Breakdown
                                                <span style="font-size: 0.8em; color: #6c757d;">(${teacher.studentData.workingDays} working days)</span>
                                            </div>
                                            <div class="breakdown-total" style="background: #28a745;">
                                                ${teacher.studentData.totalEarnedSalary} ETB earned
                                            </div>
                                        </div>
                                        
                                        <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; text-align: center;">
                                                <div>
                                                    <div style="font-size: 1.2em; font-weight: bold; color: #28a745;">${teacher.studentData.totalTeachingDays}</div>
                                                    <div style="font-size: 0.8em; color: #6c757d;">Days Taught</div>
                                                </div>
                                                <div>
                                                    <div style="font-size: 1.2em; font-weight: bold; color: #6c757d;">${teacher.studentData.totalPossibleDays}</div>
                                                    <div style="font-size: 0.8em; color: #6c757d;">Possible Days</div>
                                                </div>
                                                <div>
                                                    <div style="font-size: 1.2em; font-weight: bold; color: #007bff;">${teacher.studentData.attendanceRate}</div>
                                                    <div style="font-size: 0.8em; color: #6c757d;">Attendance Rate</div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="package-breakdown">
                                            <h5>📦 Package-wise Daily Breakdown:</h5>
                                            ${teacher.studentData.packageBreakdown.map((pkg: any) => `
                                                <div class="package-card" style="border-left: 4px solid #28a745;">
                                                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                                                        <strong>${pkg.packageName}</strong>
                                                        <span style="background: #e8f5e8; padding: 4px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold;">${pkg.count} students</span>
                                                    </div>
                                                    <div style="font-size: 0.9em; color: #6c757d; margin-bottom: 8px;">
                                                        Monthly Rate: <strong>${pkg.salaryPerStudent} ETB</strong> ÷ ${teacher.studentData.workingDays} working days = <strong>${pkg.dailySalary?.toFixed(2)} ETB/day</strong>
                                                    </div>
                                                    <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; margin-bottom: 10px;">
                                                        <div>Teaching Days: <strong>${pkg.totalTeachingDays}/${pkg.totalPossibleDays}</strong></div>
                                                        <div>Earned: <strong>${pkg.totalSalary?.toFixed(2)} ETB</strong></div>
                                                    </div>
                                                    
                                                    ${pkg.students?.length > 0 ? `
                                                    <div style="margin-top: 10px;">
                                                        <div style="font-size: 0.85em; font-weight: bold; margin-bottom: 5px;">Student Details:</div>
                                                        ${pkg.students.map((student: any) => `
                                                            <div style="background: #ffffff; border: 1px solid #dee2e6; padding: 8px; border-radius: 4px; margin: 4px 0; font-size: 0.8em;">
                                                                <div style="display: flex; justify-content: between; align-items: center;">
                                                                    <span><strong>${student.name}</strong></span>
                                                                    <span style="color: #28a745; font-weight: bold;">${student.teachingDays} days → ${student.earnedSalary} ETB</span>
                                                                </div>
                                                            </div>
                                                        `).join('')}
                                                    </div>
                                                    ` : ''}
                                                </div>
                                            `).join('')}
                                        </div>
                                        
                                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 12px; margin-top: 15px;">
                                            <div style="font-size: 0.85em; color: #856404;">
                                                <strong>💡 How Daily Payment Works:</strong><br>
                                                • Teacher earns daily rate when Zoom link is sent to student<br>
                                                • Monthly salary is divided by working days (${teacher.studentData.workingDays} days this month)<br>
                                                • Mid-month changes are handled automatically<br>
                                                • ${teacher.studentData.workingDays < teacher.studentData.daysInMonth ? 'Sundays excluded from calculation' : 'All days included in calculation'}
                                            </div>
                                        </div>
                                    </div>
                                    ` : ''}
                                    
                                    ${teacher.breakdown.latenessRecords?.length > 0 ? `
                                    <div class="breakdown-item deduction">
                                        <div class="breakdown-header">
                                            <div class="breakdown-title">
                                                ⏰ Lateness Records
                                                <span style="font-size: 0.8em; color: #6c757d;">(${teacher.breakdown.latenessRecords.length} incidents)</span>
                                            </div>
                                            <div class="breakdown-total">
                                                -${teacher.breakdown.latenessRecords.reduce((sum: number, r: any) => sum + r.deductionApplied, 0)} ETB
                                            </div>
                                        </div>
                                        ${teacher.breakdown.latenessRecords.map((record: any) => `
                                            <div class="record-item">
                                                <div class="record-header">
                                                    <div class="record-date">
                                                        📅 ${new Date(record.classDate).toLocaleDateString()}
                                                        <span style="font-size: 0.8em; color: #6c757d; margin-left: 8px;">
                                                            ${new Date(record.classDate).toLocaleDateString('en-US', { weekday: 'long' })}
                                                        </span>
                                                    </div>
                                                    <div class="record-amount">-${record.deductionApplied} ETB</div>
                                                </div>
                                                <div class="record-details">
                                                    <span class="detail-badge badge-lateness">⏱️ ${record.latenessMinutes} min late</span>
                                                    <span class="detail-badge badge-tier">📊 ${record.deductionTier}</span>
                                                    ${record.studentName ? `<span class="detail-badge badge-student">👤 ${record.studentName}</span>` : ''}
                                                </div>
                                                ${record.scheduledTime && record.actualStartTime ? `
                                                <div class="calculation-box">
                                                    <div style="font-weight: bold; margin-bottom: 8px;">⚙️ Calculation Details</div>
                                                    <div>Base Amount × Tier Percentage = ${record.deductionApplied} ETB</div>
                                                    <div class="time-info">
                                                        <div><strong>Scheduled:</strong> ${new Date(record.scheduledTime).toLocaleTimeString()}</div>
                                                        <div><strong>Actual Start:</strong> ${new Date(record.actualStartTime).toLocaleTimeString()}</div>
                                                    </div>
                                                </div>
                                                ` : ''}
                                            </div>
                                        `).join('')}
                                    </div>
                                    ` : ''}
                                    
                                    ${teacher.breakdown.absenceRecords?.length > 0 ? `
                                    <div class="breakdown-item deduction">
                                        <div class="breakdown-header">
                                            <div class="breakdown-title">
                                                🚫 Absence Records
                                                <span style="font-size: 0.8em; color: #6c757d;">(${teacher.breakdown.absenceRecords.length} days)</span>
                                            </div>
                                            <div class="breakdown-total">
                                                -${teacher.breakdown.absenceRecords.reduce((sum: number, r: any) => sum + r.deductionApplied, 0)} ETB
                                            </div>
                                        </div>
                                        ${teacher.breakdown.absenceRecords.map((record: any) => {
                                            let timeSlotsInfo = 'Full Day';
                                            let slotsCount = 0;
                                            if (record.timeSlots) {
                                                try {
                                                    const slots = JSON.parse(record.timeSlots);
                                                    if (slots.includes('Whole Day')) {
                                                        timeSlotsInfo = '🚫 Whole Day';
                                                    } else {
                                                        slotsCount = slots.length;
                                                        timeSlotsInfo = `⏰ ${slotsCount} Time Slot${slotsCount > 1 ? 's' : ''}`;
                                                    }
                                                } catch {}
                                            }
                                            return `
                                            <div class="record-item">
                                                <div class="record-header">
                                                    <div class="record-date">
                                                        📅 ${new Date(record.classDate).toLocaleDateString()}
                                                        <span style="font-size: 0.8em; color: #6c757d; margin-left: 8px;">
                                                            ${new Date(record.classDate).toLocaleDateString('en-US', { weekday: 'long' })}
                                                        </span>
                                                    </div>
                                                    <div class="record-amount">-${record.deductionApplied} ETB</div>
                                                </div>
                                                <div class="record-details">
                                                    <span class="detail-badge ${timeSlotsInfo.includes('Whole Day') ? 'badge-unpermitted' : 'badge-lateness'}">${timeSlotsInfo}</span>
                                                    <span class="detail-badge ${record.permitted ? 'badge-permitted' : 'badge-unpermitted'}">
                                                        ${record.permitted ? '✅ Permitted' : '❌ Unpermitted'}
                                                    </span>
                                                    <span class="detail-badge badge-tier">
                                                        ${record.reviewedByManager ? '🤖 Auto-Detected' : '👁️ Manual Review'}
                                                    </span>
                                                </div>
                                                ${(() => {
                                                    let calculationDisplay = "";
                                                    if (record.timeSlots) {
                                                        try {
                                                            const slots = JSON.parse(record.timeSlots);
                                                            if (slots.includes('Whole Day')) {
                                                                calculationDisplay = `Whole Day Deduction: ${record.deductionApplied} ETB (Fixed Rate)`;
                                                            } else {
                                                                const perSlotRate = Math.round(record.deductionApplied / slots.length);
                                                                calculationDisplay = `Time Slot Deduction: ${perSlotRate} ETB × ${slots.length} slots = ${record.deductionApplied} ETB`;
                                                            }
                                                        } catch {
                                                            calculationDisplay = `Legacy Calculation: ${record.deductionApplied} ETB`;
                                                        }
                                                    } else {
                                                        calculationDisplay = `Legacy Calculation: ${record.deductionApplied} ETB`;
                                                    }
                                                    return `
                                                    <div class="calculation-box">
                                                        <div style="font-weight: bold; margin-bottom: 8px;">⚙️ Calculation Details</div>
                                                        <div>${calculationDisplay}</div>
                                                        ${record.timeSlots && (() => {
                                                            try {
                                                                const slots = JSON.parse(record.timeSlots);
                                                                if (!slots.includes('Whole Day') && slots.length > 0) {
                                                                    return `
                                                                    <div style="margin-top: 8px; font-size: 0.9em; color: #6c757d;">
                                                                        <strong>Affected time slots:</strong> ${slots.slice(0, 2).join(', ')}${slots.length > 2 ? ` +${slots.length - 2} more` : ''}
                                                                    </div>
                                                                    `;
                                                                }
                                                            } catch {}
                                                            return '';
                                                        })()}
                                                    </div>
                                                    `;
                                                })()}
                                                ${record.reviewNotes ? `
                                                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 10px; margin-top: 10px;">
                                                    <div style="font-size: 0.85em; color: #856404;">
                                                        <strong>📝 Admin Note:</strong> ${record.reviewNotes}
                                                    </div>
                                                </div>
                                                ` : ''}
                                                ${record.deductionApplied === 0 && record.reviewNotes?.includes('System Issue') ? `
                                                <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 6px; padding: 8px; margin-top: 8px;">
                                                    <div style="font-size: 0.8em; color: #0c5460; font-weight: 600;">
                                                        ✅ ADJUSTED: Deduction waived due to system issue
                                                    </div>
                                                </div>
                                                ` : ''}
                                            </div>
                                            `;
                                        }).join('')}
                                    </div>
                                    ` : ''}
                                    
                                    ${teacher.breakdown.bonusRecords?.length > 0 ? `
                                    <div class="breakdown-item bonus">
                                        <div class="breakdown-header">
                                            <div class="breakdown-title">
                                                🏆 Bonus Records
                                                <span style="font-size: 0.8em; color: #6c757d;">(${teacher.breakdown.bonusRecords.length} awards)</span>
                                            </div>
                                            <div class="breakdown-total" style="background: #28a745;">
                                                +${teacher.breakdown.bonusRecords.reduce((sum: number, r: any) => sum + r.amount, 0)} ETB
                                            </div>
                                        </div>
                                        ${teacher.breakdown.bonusRecords.map((record: any) => `
                                            <div class="record-item">
                                                <div class="record-header">
                                                    <div class="record-date">
                                                        📅 ${new Date(record.createdAt).toLocaleDateString()}
                                                    </div>
                                                    <div class="record-amount" style="background: #28a745;">+${record.amount} ETB</div>
                                                </div>
                                                <div style="margin-top: 8px; padding: 10px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #28a745;">
                                                    <div style="font-weight: 600; color: #495057;">📝 ${record.reason}</div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                        ` : ''}
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p><strong>DarulKubra Academy</strong> • Teacher Payment Management System</p>
            <p>Report generated automatically on ${new Date().toLocaleString()}</p>
            ${includeDetails ? '<p style="margin-top: 10px; font-size: 0.9em; color: #28a745;">✅ This detailed report includes comprehensive breakdown of all salary components</p>' : ''}
            <p style="margin-top: 10px; font-size: 0.9em;">
                📧 For questions about this report, contact the administration team
            </p>
        </div>
    </div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}