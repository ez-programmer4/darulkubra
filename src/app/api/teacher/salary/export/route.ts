import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createSalaryCalculator } from "@/lib/salary-calculator";
import { parseISO } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    // Validate session
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!session || session.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const format = url.searchParams.get("format") || "pdf";

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing startDate or endDate" },
        { status: 400 }
      );
    }

    // Parse and validate dates
    const from = parseISO(startDate);
    const to = parseISO(endDate);

    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
      return NextResponse.json(
        { error: "Invalid date range. Use UTC ISO format (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    // Get teacher ID from session
    const teacherId = session.id;
    if (!teacherId) {
      return NextResponse.json(
        { error: "Teacher ID not found in session" },
        { status: 400 }
      );
    }

    // Get salary data
    const calculator = await createSalaryCalculator();
    const salary = await calculator.calculateTeacherSalary(teacherId, from, to);
    const details = await calculator.getTeacherSalaryDetails(
      teacherId,
      from,
      to
    );

    if (format === "pdf") {
      // Generate PDF report
      const pdfContent = generatePDFReport(salary, details, from, to);

      return new NextResponse(new Uint8Array(pdfContent), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="salary-report-${startDate}-to-${endDate}.pdf"`,
        },
      });
    } else if (format === "csv") {
      // Generate CSV report
      const csvContent = generateCSVReport(salary, details);

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="salary-report-${startDate}-to-${endDate}.csv"`,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Unsupported format. Use 'pdf' or 'csv'" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error in teacher salary export API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

function generatePDFReport(
  salary: any,
  details: any,
  from: Date,
  to: Date
): Buffer {
  // This is a simplified PDF generation
  // In a real implementation, you would use a library like puppeteer or jsPDF
  const content = `
    Teacher Salary Report
    Period: ${from.toISOString().split("T")[0]} to ${
    to.toISOString().split("T")[0]
  }
    
    Teacher: ${salary.teacherName}
    Base Salary: ${salary.baseSalary}
    Lateness Deduction: ${salary.latenessDeduction}
    Absence Deduction: ${salary.absenceDeduction}
    Bonuses: ${salary.bonuses}
    Total Salary: ${salary.totalSalary}
    Status: ${salary.status}
    
    Student Breakdown:
    ${salary.breakdown.studentBreakdown
      .map(
        (student: any) =>
          `${student.studentName} (${student.package}): ${student.totalEarned}`
      )
      .join("\n")}
  `;

  // Return a simple text-based "PDF" for demonstration
  return Buffer.from(content);
}

function generateCSVReport(salary: any, details: any): string {
  const headers = [
    "Teacher Name",
    "Base Salary",
    "Lateness Deduction",
    "Absence Deduction",
    "Bonuses",
    "Total Salary",
    "Status",
    "Students",
    "Teaching Days",
  ];

  const rows = [
    [
      salary.teacherName,
      salary.baseSalary,
      salary.latenessDeduction,
      salary.absenceDeduction,
      salary.bonuses,
      salary.totalSalary,
      salary.status,
      salary.numStudents,
      salary.teachingDays,
    ],
  ];

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  return csvContent;
}

