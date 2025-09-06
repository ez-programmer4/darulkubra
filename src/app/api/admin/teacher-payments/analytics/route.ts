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
    
    // Calculate comprehensive analytics
    const totalTeachers = teachersData.length;
    const totalBaseSalary = teachersData.reduce((sum: number, t: any) => sum + t.baseSalary, 0);
    const totalLatenessDeduction = teachersData.reduce((sum: number, t: any) => sum + t.latenessDeduction, 0);
    const totalAbsenceDeduction = teachersData.reduce((sum: number, t: any) => sum + t.absenceDeduction, 0);
    const totalBonuses = teachersData.reduce((sum: number, t: any) => sum + t.bonuses, 0);
    const totalSalary = teachersData.reduce((sum: number, t: any) => sum + t.totalSalary, 0);
    const totalStudents = teachersData.reduce((sum: number, t: any) => sum + (t.numStudents || 0), 0);
    
    // Performance metrics
    const avgSalaryPerTeacher = totalSalary / totalTeachers;
    const avgStudentsPerTeacher = totalStudents / totalTeachers;
    const deductionRate = ((totalLatenessDeduction + totalAbsenceDeduction) / totalBaseSalary) * 100;
    const bonusRate = (totalBonuses / totalBaseSalary) * 100;
    
    // Top performers
    const topEarners = [...teachersData].sort((a, b) => b.totalSalary - a.totalSalary).slice(0, 5);
    const mostStudents = [...teachersData].sort((a, b) => (b.numStudents || 0) - (a.numStudents || 0)).slice(0, 5);
    const highestDeductions = [...teachersData].sort((a, b) => (b.latenessDeduction + b.absenceDeduction) - (a.latenessDeduction + a.absenceDeduction)).slice(0, 5);
    const topBonusEarners = [...teachersData].filter(t => t.bonuses > 0).sort((a, b) => b.bonuses - a.bonuses).slice(0, 5);

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Teacher Payment Analytics - ${monthYear}</title>
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
        .analytics-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
        }
        .metric-card { 
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); 
            padding: 25px; 
            border-radius: 15px; 
            text-align: center;
            border: 1px solid #dee2e6;
            position: relative;
            overflow: hidden;
        }
        .metric-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #667eea, #764ba2);
        }
        .metric-card h3 { 
            color: #495057; 
            font-size: 0.9em; 
            text-transform: uppercase; 
            margin-bottom: 15px;
            font-weight: 600;
            letter-spacing: 0.5px;
        }
        .metric-card .value { 
            font-size: 2.2em; 
            font-weight: bold; 
            color: #667eea;
            margin-bottom: 10px;
        }
        .metric-card .subtitle {
            font-size: 0.85em;
            color: #6c757d;
            font-weight: 500;
        }
        .section { 
            margin-bottom: 40px;
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 2px 15px rgba(0,0,0,0.08);
            border: 1px solid #e9ecef;
        }
        .section h2 { 
            color: #495057; 
            margin-bottom: 20px;
            font-size: 1.5em;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        .top-list { 
            display: grid; 
            gap: 15px; 
        }
        .top-item { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            padding: 15px 20px; 
            background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); 
            border-radius: 10px;
            border-left: 4px solid #667eea;
            transition: all 0.3s ease;
        }
        .top-item:hover {
            transform: translateX(5px);
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.15);
        }
        .rank { 
            background: #667eea; 
            color: white; 
            width: 30px; 
            height: 30px; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-weight: bold;
            font-size: 0.9em;
        }
        .teacher-name { 
            flex: 1; 
            margin-left: 15px; 
            font-weight: 600;
            color: #495057;
        }
        .metric-value { 
            font-weight: bold; 
            color: #667eea;
            font-size: 1.1em;
        }
        .insights {
            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #2196f3;
        }
        .insights h3 {
            color: #1976d2;
            margin-bottom: 15px;
        }
        .insights ul {
            list-style: none;
            padding: 0;
        }
        .insights li {
            margin: 8px 0;
            padding-left: 20px;
            position: relative;
        }
        .insights li::before {
            content: '💡';
            position: absolute;
            left: 0;
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
        }
        @media print {
            body { background: white; }
            .container { box-shadow: none; }
            .print-btn { display: none; }
        }
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">🖨️ Print Analytics</button>
    
    <div class="container">
        <div class="header">
            <h1>📊 Teacher Payment Analytics</h1>
            <p>${monthYear} • Comprehensive Performance Analysis</p>
        </div>

        <div class="analytics-grid">
            <div class="metric-card">
                <h3>👥 Total Teachers</h3>
                <div class="value">${totalTeachers}</div>
                <div class="subtitle">Active teaching staff</div>
            </div>
            <div class="metric-card">
                <h3>🎓 Total Students</h3>
                <div class="value">${totalStudents}</div>
                <div class="subtitle">${avgStudentsPerTeacher.toFixed(1)} avg per teacher</div>
            </div>
            <div class="metric-card">
                <h3>💰 Average Salary</h3>
                <div class="value">${avgSalaryPerTeacher.toLocaleString()} ETB</div>
                <div class="subtitle">Per teacher monthly</div>
            </div>
            <div class="metric-card">
                <h3>📉 Deduction Rate</h3>
                <div class="value">${deductionRate.toFixed(1)}%</div>
                <div class="subtitle">Of base salary</div>
            </div>
            <div class="metric-card">
                <h3>📈 Bonus Rate</h3>
                <div class="value">${bonusRate.toFixed(1)}%</div>
                <div class="subtitle">Of base salary</div>
            </div>
            <div class="metric-card">
                <h3>💵 Net Payout</h3>
                <div class="value">${totalSalary.toLocaleString()} ETB</div>
                <div class="subtitle">Total for ${monthYear}</div>
            </div>
        </div>

        <div class="section">
            <h2>🏆 Top Earners</h2>
            <div class="top-list">
                ${topEarners.map((teacher, index) => `
                    <div class="top-item">
                        <div class="rank">${index + 1}</div>
                        <div class="teacher-name">${teacher.name}</div>
                        <div class="metric-value">${teacher.totalSalary.toLocaleString()} ETB</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2>👥 Most Students</h2>
            <div class="top-list">
                ${mostStudents.map((teacher, index) => `
                    <div class="top-item">
                        <div class="rank">${index + 1}</div>
                        <div class="teacher-name">${teacher.name}</div>
                        <div class="metric-value">${teacher.numStudents || 0} students</div>
                    </div>
                `).join('')}
            </div>
        </div>

        ${topBonusEarners.length > 0 ? `
        <div class="section">
            <h2>🎖️ Top Bonus Earners</h2>
            <div class="top-list">
                ${topBonusEarners.map((teacher, index) => `
                    <div class="top-item">
                        <div class="rank">${index + 1}</div>
                        <div class="teacher-name">${teacher.name}</div>
                        <div class="metric-value">+${teacher.bonuses.toLocaleString()} ETB</div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <div class="section">
            <div class="insights">
                <h3>📈 Key Insights</h3>
                <ul>
                    <li>Average teacher manages ${avgStudentsPerTeacher.toFixed(1)} students</li>
                    <li>Deduction rate is ${deductionRate.toFixed(1)}% of base salary</li>
                    <li>Bonus rate is ${bonusRate.toFixed(1)}% of base salary</li>
                    <li>${topBonusEarners.length} teachers earned bonuses this month</li>
                    <li>Total payout: ${totalSalary.toLocaleString()} ETB for ${totalTeachers} teachers</li>
                </ul>
            </div>
        </div>

        <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 10px;">
            <p><strong>DarulKubra Academy</strong> • Advanced Analytics Report</p>
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
      { error: "Failed to generate analytics report" },
      { status: 500 }
    );
  }
}