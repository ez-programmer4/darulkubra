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

    // Calculate teacher payments
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

        return {
          id: teacher.ustazid,
          name: teacher.ustazname,
          baseSalary,
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
        .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
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
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; margin-top: 40px; }
        @media print { .header { -webkit-print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>TEACHER SALARY REPORT</h1>
        <p>Package-Based Salary Management System</p>
        <p>Generated on ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
      </div>

      <div class="container">
        <div class="period">
          <h2>📅 Report Period</h2>
          <p><strong>${from.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} - ${to.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
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
        </div>

        <div class="rates">
          <h3>💰 Package Salary Rates</h3>
          <div class="rate-grid">
            ${Object.entries(salaryMap).map(([pkg, salary]) => `
              <div class="rate-item">
                <strong>${pkg}</strong><br>
                <span style="color: #059669;">${salary} ETB per student</span>
              </div>
            `).join('')}
          </div>
        </div>

        <h2 style="color: #1e40af; margin-bottom: 20px; font-size: 20px;">👥 Teacher Salary Breakdown</h2>
        
        ${teacherPayments.map((teacher, index) => `
          <div class="teacher-section">
            <div class="teacher-header">
              <div>
                <strong>${index + 1}. ${teacher.name}</strong>
                <div style="font-size: 12px; opacity: 0.9;">${teacher.numStudents} students</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 18px; font-weight: bold;">${teacher.baseSalary.toLocaleString()} ETB</div>
                <div style="font-size: 12px; opacity: 0.9;">Total Salary</div>
              </div>
            </div>
            <div class="teacher-content">
              <h4 style="color: #374151; margin-bottom: 15px;">Package Distribution:</h4>
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
          </div>
        `).join('')}
      </div>

      <div class="footer">
        <p>🔒 This report is confidential and generated automatically by the Teacher Payment System</p>
        <p>Report ID: TPR-${Date.now()} | Generated by: ${session.name || 'System Admin'}</p>
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