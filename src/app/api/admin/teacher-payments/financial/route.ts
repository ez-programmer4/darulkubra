import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { startDate, endDate, teachersData } = await req.json();
    
    const fromDate = new Date(startDate);
    const toDate = new Date(endDate);
    const monthYear = fromDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Calculate totals for financial board
    const totalTeachers = teachersData.length;
    const totalBaseSalary = teachersData.reduce((sum: number, t: any) => sum + t.baseSalary, 0);
    const totalLatenessDeduction = teachersData.reduce((sum: number, t: any) => sum + t.latenessDeduction, 0);
    const totalAbsenceDeduction = teachersData.reduce((sum: number, t: any) => sum + t.absenceDeduction, 0);
    const totalBonuses = teachersData.reduce((sum: number, t: any) => sum + t.bonuses, 0);
    const totalDeductions = totalLatenessDeduction + totalAbsenceDeduction;
    const netPayroll = totalBaseSalary - totalDeductions + totalBonuses;
    const totalStudents = teachersData.reduce((sum: number, t: any) => sum + (t.numStudents || 0), 0);

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Financial Board Report - ${monthYear}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Times New Roman', serif; 
            line-height: 1.6; 
            color: #2c3e50; 
            background: white;
        }
        .container { 
            max-width: 210mm; 
            margin: 0 auto; 
            padding: 20mm;
        }
        .letterhead { 
            text-align: center; 
            margin-bottom: 40px; 
            border-bottom: 3px solid #2c3e50;
            padding-bottom: 20px;
        }
        .letterhead h1 { 
            font-size: 28px; 
            font-weight: bold; 
            color: #2c3e50;
            margin-bottom: 5px;
        }
        .confidential {
            background: #e74c3c;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-weight: bold;
            display: inline-block;
            margin-bottom: 20px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 20px 0;
        }
        .summary-item {
            text-align: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 6px;
            border: 1px solid #dee2e6;
        }
        .financial-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .financial-table th {
            background: #34495e;
            color: white;
            padding: 12px;
            text-align: left;
            border: 1px solid #2c3e50;
        }
        .financial-table td {
            padding: 10px 12px;
            border: 1px solid #bdc3c7;
        }
        .amount { text-align: right; font-family: monospace; font-weight: 600; }
        .total-row { background: #ecf0f1 !important; font-weight: bold; }
        .print-controls {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .print-btn {
            background: #3498db;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 0 5px;
        }
        .save-pdf-btn { background: #27ae60; }
        @media print { .print-controls { display: none; } }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
</head>
<body>
    <div class="print-controls">
        <button class="print-btn" onclick="window.print()">🖨️ Print</button>
        <button class="print-btn save-pdf-btn" onclick="savePDF()">💾 Save PDF</button>
    </div>

    <div class="container" id="report-content">
        <div class="letterhead">
            <h1>DARULKUBRA ACADEMY</h1>
            <div>Educational Excellence • Islamic Values</div>
        </div>

        <div class="confidential">CONFIDENTIAL - FINANCIAL BOARD ONLY</div>

        <h2>Monthly Teacher Payroll Report</h2>
        <p><strong>Period:</strong> ${monthYear}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>

        <div class="summary-grid">
            <div class="summary-item">
                <div>Teaching Staff</div>
                <div style="font-size: 20px; font-weight: bold;">${totalTeachers}</div>
            </div>
            <div class="summary-item">
                <div>Total Students</div>
                <div style="font-size: 20px; font-weight: bold;">${totalStudents}</div>
            </div>
            <div class="summary-item">
                <div>Net Payroll</div>
                <div style="font-size: 20px; font-weight: bold; color: #3498db;">${netPayroll.toLocaleString()} ETB</div>
            </div>
        </div>

        <h3>💰 Financial Breakdown</h3>
        <table class="financial-table">
            <thead>
                <tr>
                    <th>Component</th>
                    <th>Amount (ETB)</th>
                    <th>Percentage</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>Base Salaries</strong></td>
                    <td class="amount">${totalBaseSalary.toLocaleString()}</td>
                    <td class="amount">100.0%</td>
                </tr>
                <tr>
                    <td>Less: Lateness Deductions</td>
                    <td class="amount" style="color: #e74c3c;">-${totalLatenessDeduction.toLocaleString()}</td>
                    <td class="amount">${((totalLatenessDeduction/totalBaseSalary)*100).toFixed(1)}%</td>
                </tr>
                <tr>
                    <td>Less: Absence Deductions</td>
                    <td class="amount" style="color: #e74c3c;">-${totalAbsenceDeduction.toLocaleString()}</td>
                    <td class="amount">${((totalAbsenceDeduction/totalBaseSalary)*100).toFixed(1)}%</td>
                </tr>
                <tr>
                    <td>Add: Performance Bonuses</td>
                    <td class="amount" style="color: #27ae60;">+${totalBonuses.toLocaleString()}</td>
                    <td class="amount">${((totalBonuses/totalBaseSalary)*100).toFixed(1)}%</td>
                </tr>
                <tr class="total-row">
                    <td><strong>NET PAYROLL TOTAL</strong></td>
                    <td class="amount"><strong>${netPayroll.toLocaleString()}</strong></td>
                    <td class="amount"><strong>${((netPayroll/totalBaseSalary)*100).toFixed(1)}%</strong></td>
                </tr>
            </tbody>
        </table>

        <h3>📋 Individual Teacher Summary</h3>
        <table class="financial-table">
            <thead>
                <tr>
                    <th>Teacher Name</th>
                    <th>Students</th>
                    <th>Base Salary</th>
                    <th>Deductions</th>
                    <th>Bonuses</th>
                    <th>Net Salary</th>
                </tr>
            </thead>
            <tbody>
                ${teachersData.map((teacher: any) => `
                    <tr>
                        <td><strong>${teacher.name}</strong></td>
                        <td class="amount">${teacher.numStudents || 0}</td>
                        <td class="amount">${teacher.baseSalary.toLocaleString()}</td>
                        <td class="amount" style="color: #e74c3c;">-${(teacher.latenessDeduction + teacher.absenceDeduction).toLocaleString()}</td>
                        <td class="amount" style="color: #27ae60;">+${teacher.bonuses.toLocaleString()}</td>
                        <td class="amount"><strong>${teacher.totalSalary.toLocaleString()}</strong></td>
                    </tr>
                `).join('')}
                <tr class="total-row">
                    <td><strong>TOTALS</strong></td>
                    <td class="amount"><strong>${totalStudents}</strong></td>
                    <td class="amount"><strong>${totalBaseSalary.toLocaleString()}</strong></td>
                    <td class="amount"><strong>-${totalDeductions.toLocaleString()}</strong></td>
                    <td class="amount"><strong>+${totalBonuses.toLocaleString()}</strong></td>
                    <td class="amount"><strong>${netPayroll.toLocaleString()}</strong></td>
                </tr>
            </tbody>
        </table>

        <div style="margin: 30px 0; padding: 20px; background: #fff3cd; border: 1px solid #ffeaa7;">
            <h4>⚠️ Financial Board Notes</h4>
            <ul style="margin-left: 20px;">
                <li>All calculations are automated based on attendance data</li>
                <li>Net payroll amount requires board approval for disbursement</li>
                <li>Individual teacher breakdowns available upon request</li>
            </ul>
        </div>

        <div style="margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px;">
            <div style="text-align: center;">
                <div style="border-bottom: 2px solid #2c3e50; margin-bottom: 10px; height: 40px;"></div>
                <div><strong>Academic Director</strong></div>
            </div>
            <div style="text-align: center;">
                <div style="border-bottom: 2px solid #2c3e50; margin-bottom: 10px; height: 40px;"></div>
                <div><strong>Financial Board Chairman</strong></div>
            </div>
        </div>

        <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #7f8c8d; border-top: 1px solid #bdc3c7; padding-top: 20px;">
            <strong>DarulKubra Academy</strong> • Financial Management System<br>
            This document contains confidential financial information.
        </div>
    </div>

    <script>
        function savePDF() {
            const element = document.getElementById('report-content');
            const opt = {
                margin: 0.5,
                filename: 'Financial_Board_Report_${monthYear.replace(' ', '_')}.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(element).save();
        }
    </script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to generate financial report" },
      { status: 500 }
    );
  }
}