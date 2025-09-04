import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!session || (session.role !== "admin" && session.role !== "controller")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { startDate, endDate, teacherId } = await req.json();
    
    const from = new Date(startDate);
    const to = new Date(endDate);

    // Fetch data
    let teachers;
    if (teacherId) {
      teachers = await prisma.wpos_wpdatatable_24.findMany({
        where: { ustazid: teacherId },
        select: { ustazid: true, ustazname: true }
      });
    } else {
      teachers = await prisma.wpos_wpdatatable_24.findMany({
        select: { ustazid: true, ustazname: true }
      });
    }

    // Get package salaries
    const packageSalaries = await prisma.packageSalary.findMany();
    const salaryMap: Record<string, number> = {};
    packageSalaries.forEach(ps => {
      salaryMap[ps.packageName] = Number(ps.salaryPerStudent);
    });

    // Calculate teacher payments with deductions and bonuses
    const teacherPayments = await Promise.all(
      teachers.map(async (teacher) => {
        const students = await prisma.wpos_wpdatatable_23.findMany({
          where: { 
            ustaz: teacher.ustazid,
            status: { in: ["active", "Active"] }
          },
          select: { package: true, name: true }
        });

        const baseSalary = students.reduce((total, student) => {
          if (!student.package || !salaryMap[student.package]) return total;
          return total + salaryMap[student.package];
        }, 0);

        // Get package breakdown
        const packageBreakdown: Record<string, any> = {};
        students.forEach(student => {
          const pkg = student.package || "No Package";
          if (!packageBreakdown[pkg]) {
            packageBreakdown[pkg] = {
              count: 0,
              salaryPerStudent: salaryMap[pkg] || 0,
              totalSalary: 0
            };
          }
          packageBreakdown[pkg].count++;
          packageBreakdown[pkg].totalSalary = packageBreakdown[pkg].count * packageBreakdown[pkg].salaryPerStudent;
        });

        // Calculate deductions and bonuses for the period
        const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/teacher-payments?startDate=${from.toISOString()}&endDate=${to.toISOString()}`);
        const paymentsData = await res.json();
        const teacherData = paymentsData.find((t: any) => t.id === teacher.ustazid) || {
          latenessDeduction: 0,
          absenceDeduction: 0,
          bonuses: 0
        };

        const totalSalary = baseSalary - teacherData.latenessDeduction - teacherData.absenceDeduction + teacherData.bonuses;

        return {
          id: teacher.ustazid,
          name: teacher.ustazname,
          baseSalary,
          latenessDeduction: teacherData.latenessDeduction,
          absenceDeduction: teacherData.absenceDeduction,
          bonuses: teacherData.bonuses,
          totalSalary,
          numStudents: students.length,
          packageBreakdown: Object.entries(packageBreakdown).map(([name, data]) => ({
            packageName: name,
            ...data
          }))
        };
      })
    );

    // Generate HTML for PDF
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Teacher Salary Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; color: #1f2937; line-height: 1.4; }
        .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 30px; text-align: center; }
        .header h1 { font-size: 28px; margin-bottom: 8px; font-weight: bold; }
        .header p { font-size: 14px; opacity: 0.9; }
        .container { padding: 30px; }
        .period { background: #f8fafc; padding: 20px; border-left: 4px solid #3b82f6; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .summary-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; }
        .summary-card h3 { color: #374151; font-size: 14px; margin-bottom: 8px; }
        .summary-card .value { font-size: 24px; font-weight: bold; color: #1e40af; }
        .rates { background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .rates h3 { color: #1e40af; margin-bottom: 15px; font-size: 16px; }
        .rate-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .rate-item { background: white; padding: 12px; border-radius: 6px; border-left: 3px solid #3b82f6; }
        .teacher-section { margin-bottom: 40px; }
        .teacher-header { background: #1e40af; color: white; padding: 15px 20px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; }
        .teacher-content { background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 20px; }
        .package-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-top: 15px; }
        .package-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; }
        .package-card h4 { color: #1e40af; margin-bottom: 8px; font-size: 14px; }
        .package-details { font-size: 12px; color: #64748b; }
        .calculation { background: #ecfdf5; border-left: 3px solid #10b981; padding: 10px; margin-top: 8px; font-size: 12px; }
        .footer { padding: 20px; color: #6b7280; font-size: 12px; border-top: 2px solid #1e40af; margin-top: 40px; background: #f8fafc; }
        @media print { .header { -webkit-print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1>DARUL KUBRA ACADEMY</h1>
            <p style="font-size: 16px; margin-top: 5px;">Teacher Salary Report</p>
          </div>
          <div style="text-align: right; font-size: 12px;">
            <div>Report ID: TPR-${Date.now().toString().slice(-6)}</div>
            <div>Generated: ${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</div>
            <div>By: ${session.name || 'System Admin'}</div>
          </div>
        </div>
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.3);">
          <p style="font-size: 14px; opacity: 0.9;">📊 Package-Based Salary Management System | 🔒 Confidential Document</p>
        </div>
      </div>

      <div class="container">
        <div class="period">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h2>📅 Report Period</h2>
              <p><strong>${from.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} - ${to.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
            </div>
            <div style="text-align: right; font-size: 12px; color: #64748b;">
              <div>📅 Payroll Period: ${from.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
              <div>💼 Department: Academic Staff</div>
              <div>🏢 Location: Main Campus</div>
            </div>
          </div>
        </div>

        <div class="summary">
          <div class="summary-card">
            <h3>Total Teachers</h3>
            <div class="value">${teacherPayments.length}</div>
          </div>
          <div class="summary-card">
            <h3>Total Students</h3>
            <div class="value">${teacherPayments.reduce((sum, t) => sum + t.numStudents, 0)}</div>
          </div>
          <div class="summary-card">
            <h3>Total Base Salary</h3>
            <div class="value">${teacherPayments.reduce((sum, t) => sum + t.baseSalary, 0).toLocaleString()} ETB</div>
          </div>
          <div class="summary-card">
            <h3>Total Deductions</h3>
            <div class="value" style="color: #dc2626;">${teacherPayments.reduce((sum, t) => sum + (t.latenessDeduction || 0) + (t.absenceDeduction || 0), 0).toLocaleString()} ETB</div>
          </div>
          <div class="summary-card">
            <h3>Total Bonuses</h3>
            <div class="value" style="color: #059669;">${teacherPayments.reduce((sum, t) => sum + (t.bonuses || 0), 0).toLocaleString()} ETB</div>
          </div>
          <div class="summary-card">
            <h3>Net Total Salary</h3>
            <div class="value" style="color: #1e40af;">${teacherPayments.reduce((sum, t) => sum + (t.totalSalary || t.baseSalary), 0).toLocaleString()} ETB</div>
          </div>
        </div>

        <div class="rates">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3>💰 Package Salary Rates</h3>
            <div style="font-size: 12px; color: #64748b;">
              <span>📅 Effective Date: ${from.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} | 🔄 Last Updated: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
          <div class="rate-grid">
            ${Object.entries(salaryMap).map(([pkg, salary]) => `
              <div class="rate-item">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <strong>${pkg}</strong>
                  <span style="background: #e0f2fe; color: #0277bd; padding: 2px 6px; border-radius: 4px; font-size: 10px;">ACTIVE</span>
                </div>
                <span style="color: #059669; font-weight: bold;">${salary} ETB per student</span>
                <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
                  Monthly Rate • Per Active Student
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="color: #1e40af; font-size: 20px;">👥 Individual Teacher Breakdown</h2>
          <div style="font-size: 12px; color: #64748b;">
            <span>📈 ${teacherPayments.length} Teachers • 👨‍🏫 ${teacherPayments.reduce((sum, t) => sum + t.numStudents, 0)} Students • 💵 ${teacherPayments.reduce((sum, t) => sum + (t.totalSalary || t.baseSalary), 0).toLocaleString()} ETB Total</span>
          </div>
        </div>
        
        ${teacherPayments.map((teacher, index) => `
          <div class="teacher-section">
            <div class="teacher-header">
              <div>
                <strong>${index + 1}. ${teacher.name}</strong>
                <div style="font-size: 12px; opacity: 0.9;">
                  👨🏫 ${teacher.numStudents} Students • 🏢 Teacher ID: T${teacher.id.slice(-4)} • 📅 ${from.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 18px; font-weight: bold;">${(teacher.totalSalary || teacher.baseSalary).toLocaleString()} ETB</div>
                <div style="font-size: 12px; opacity: 0.9;">
                  Net Monthly Salary • 💵 ${((teacher.totalSalary || teacher.baseSalary) / teacher.numStudents || 0).toFixed(0)} ETB/student
                </div>
              </div>
            </div>
            <div class="teacher-content">
              <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                  <h4 style="color: #374151; margin-bottom: 15px;">📦 Package Distribution:</h4>
                  <div class="package-grid">
                    ${teacher.packageBreakdown.map((pkg: any) => `
                      <div class="package-card">
                        <h4>${pkg.packageName}</h4>
                        <div class="package-details">
                          <div>Students: <strong>${pkg.count}</strong></div>
                          <div>Rate: <strong>${pkg.salaryPerStudent} ETB/student</strong></div>
                        </div>
                        <div class="calculation">
                          ${pkg.count} × ${pkg.salaryPerStudent} = <strong>${pkg.totalSalary} ETB</strong>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
                <div>
                  <h4 style="color: #374151; margin-bottom: 15px;">💰 Salary Breakdown:</h4>
                  <div style="background: #f8fafc; padding: 15px; border-radius: 8px; font-size: 13px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <span>Base Salary:</span>
                      <strong style="color: #059669;">${teacher.baseSalary.toLocaleString()} ETB</strong>
                    </div>
                    ${(teacher.latenessDeduction || 0) > 0 ? `
                      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span>Lateness Deduction:</span>
                        <strong style="color: #dc2626;">-${teacher.latenessDeduction.toLocaleString()} ETB</strong>
                      </div>
                    ` : ''}
                    ${(teacher.absenceDeduction || 0) > 0 ? `
                      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span>Absence Deduction:</span>
                        <strong style="color: #dc2626;">-${teacher.absenceDeduction.toLocaleString()} ETB</strong>
                      </div>
                    ` : ''}
                    ${(teacher.bonuses || 0) > 0 ? `
                      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span>Bonuses:</span>
                        <strong style="color: #059669;">+${teacher.bonuses.toLocaleString()} ETB</strong>
                      </div>
                    ` : ''}
                    <hr style="margin: 10px 0; border: none; border-top: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; font-size: 14px;">
                      <span><strong>Net Salary:</strong></span>
                      <strong style="color: #1e40af; font-size: 16px;">${(teacher.totalSalary || teacher.baseSalary).toLocaleString()} ETB</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="footer">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; margin-bottom: 15px;">
          <div>
            <strong>Prepared By:</strong><br>
            ${session.name || 'System Admin'}<br>
            <span style="font-size: 10px;">HR Department</span>
          </div>
          <div>
            <strong>Reviewed By:</strong><br>
            ________________<br>
            <span style="font-size: 10px;">Academic Director</span>
          </div>
          <div>
            <strong>Approved By:</strong><br>
            ________________<br>
            <span style="font-size: 10px;">Principal</span>
          </div>
        </div>
        <hr style="margin: 15px 0; border: none; border-top: 1px solid #e5e7eb;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <p>🔒 <strong>CONFIDENTIAL DOCUMENT</strong> - For Internal Use Only</p>
            <p style="font-size: 10px;">This report contains sensitive salary information. Unauthorized distribution is prohibited.</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Darul Kubra Academy</strong></p>
            <p style="font-size: 10px;">Teacher Payment Management System v2.0</p>
            <p style="font-size: 10px;">Report ID: TPR-${Date.now().toString().slice(-8)} | Page 1 of 1</p>
          </div>
        </div>
      </div>
    </body>
    </html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="teacher-salary-report-${new Date().toISOString().split('T')[0]}.html"`
      }
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}