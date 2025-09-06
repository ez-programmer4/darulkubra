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
          
          // Fetch student package breakdown
          const studentsRes = await fetch(`${req.nextUrl.origin}/api/admin/teacher-students/${teacher.id}`);
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
            background: white;
            margin: 10px 0;
            padding: 15px;
            border-radius: 8px;
            border-left: 3px solid #28a745;
        }
        .breakdown-item.deduction {
            border-left-color: #dc3545;
        }
        .breakdown-item.bonus {
            border-left-color: #ffc107;
        }
        .package-breakdown {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 15px 0;
        }
        .package-card {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #dee2e6;
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
                                    <div class="package-breakdown">
                                        <h5>📦 Package Distribution:</h5>
                                        ${teacher.studentData.packageBreakdown.map((pkg: any) => `
                                            <div class="package-card">
                                                <strong>${pkg.packageName}</strong><br>
                                                ${pkg.count} students × ${pkg.salaryPerStudent} ETB = <strong>${pkg.totalSalary} ETB</strong>
                                            </div>
                                        `).join('')}
                                    </div>
                                    ` : ''}
                                    
                                    ${teacher.breakdown.latenessRecords?.length > 0 ? `
                                    <div class="breakdown-item deduction">
                                        <h5>⏰ Lateness Records (${teacher.breakdown.latenessRecords.length} incidents)</h5>
                                        ${teacher.breakdown.latenessRecords.map((record: any) => `
                                            <div style="margin: 8px 0; padding: 8px; background: #fff3cd; border-radius: 4px;">
                                                📅 ${new Date(record.classDate).toLocaleDateString()} - 
                                                👤 ${record.studentName || 'N/A'} - 
                                                ⏱️ ${record.latenessMinutes} min late - 
                                                💰 ${record.deductionApplied} ETB (${record.deductionTier})
                                            </div>
                                        `).join('')}
                                        <strong>Total Lateness Deduction: ${teacher.breakdown.latenessRecords.reduce((sum: number, r: any) => sum + r.deductionApplied, 0)} ETB</strong>
                                    </div>
                                    ` : ''}
                                    
                                    ${teacher.breakdown.absenceRecords?.length > 0 ? `
                                    <div class="breakdown-item deduction">
                                        <h5>🚫 Absence Records (${teacher.breakdown.absenceRecords.length} days)</h5>
                                        ${teacher.breakdown.absenceRecords.map((record: any) => {
                                            let timeSlotsInfo = 'Full Day';
                                            if (record.timeSlots) {
                                                try {
                                                    const slots = JSON.parse(record.timeSlots);
                                                    if (slots.includes('Whole Day')) {
                                                        timeSlotsInfo = 'Whole Day';
                                                    } else {
                                                        timeSlotsInfo = `${slots.length} Time Slots`;
                                                    }
                                                } catch {}
                                            }
                                            return `
                                            <div style="margin: 8px 0; padding: 8px; background: #f8d7da; border-radius: 4px;">
                                                📅 ${new Date(record.classDate).toLocaleDateString()} - 
                                                ⏰ ${timeSlotsInfo} - 
                                                ${record.permitted ? '✅ Permitted' : '❌ Unpermitted'} - 
                                                💰 ${record.deductionApplied} ETB
                                                ${record.reviewNotes ? `<br><small>📝 ${record.reviewNotes}</small>` : ''}
                                            </div>
                                            `;
                                        }).join('')}
                                        <strong>Total Absence Deduction: ${teacher.breakdown.absenceRecords.reduce((sum: number, r: any) => sum + r.deductionApplied, 0)} ETB</strong>
                                    </div>
                                    ` : ''}
                                    
                                    ${teacher.breakdown.bonusRecords?.length > 0 ? `
                                    <div class="breakdown-item bonus">
                                        <h5>🏆 Bonus Records (${teacher.breakdown.bonusRecords.length} awards)</h5>
                                        ${teacher.breakdown.bonusRecords.map((record: any) => `
                                            <div style="margin: 8px 0; padding: 8px; background: #d4edda; border-radius: 4px;">
                                                📅 ${new Date(record.createdAt).toLocaleDateString()} - 
                                                💰 +${record.amount} ETB - 
                                                📝 ${record.reason}
                                            </div>
                                        `).join('')}
                                        <strong>Total Bonuses: ${teacher.breakdown.bonusRecords.reduce((sum: number, r: any) => sum + r.amount, 0)} ETB</strong>
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