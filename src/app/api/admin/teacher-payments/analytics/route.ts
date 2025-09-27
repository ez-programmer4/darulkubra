import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "registral") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { startDate, endDate, teachersData } = body;

    const analytics = generateAnalyticsReport(teachersData, startDate, endDate);
    
    return new NextResponse(analytics, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error("Analytics report error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function generateAnalyticsReport(teachers: any[], startDate: string, endDate: string) {
  const totalTeachers = teachers.length;
  const totalSalary = teachers.reduce((sum, t) => sum + t.totalSalary, 0);
  const averageSalary = totalTeachers > 0 ? totalSalary / totalTeachers : 0;
  const totalDeductions = teachers.reduce((sum, t) => sum + t.latenessDeduction, 0);
  const totalBonuses = teachers.reduce((sum, t) => sum + t.bonuses, 0);

  // Performance tiers
  const topPerformers = teachers.filter(t => t.totalSalary > 2000);
  const goodPerformers = teachers.filter(t => t.totalSalary > 1500 && t.totalSalary <= 2000);
  const averagePerformers = teachers.filter(t => t.totalSalary > 1000 && t.totalSalary <= 1500);
  const lowPerformers = teachers.filter(t => t.totalSalary <= 1000);

  // Deduction analysis
  const highDeductions = teachers.filter(t => t.latenessDeduction > 100);
  const mediumDeductions = teachers.filter(t => t.latenessDeduction > 50 && t.latenessDeduction <= 100);
  const lowDeductions = teachers.filter(t => t.latenessDeduction > 0 && t.latenessDeduction <= 50);
  const noDeductions = teachers.filter(t => t.latenessDeduction === 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Teacher Payment Analytics Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .metric-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff; }
        .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .metric-label { color: #666; font-size: 14px; }
        .chart-container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .performance-bar { height: 20px; background: #e9ecef; border-radius: 10px; margin: 5px 0; overflow: hidden; }
        .performance-fill { height: 100%; transition: width 0.3s ease; }
        .top { background: #28a745; }
        .good { background: #17a2b8; }
        .average { background: #ffc107; }
        .low { background: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        .summary-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Teacher Payment Analytics Report</h1>
        <p>Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</p>
        <p>Generated on: ${new Date().toLocaleString()}</p>
      </div>

      <div class="section">
        <h2>📈 Key Metrics</h2>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-value">${totalTeachers}</div>
            <div class="metric-label">Total Teachers</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${totalSalary.toLocaleString()} ETB</div>
            <div class="metric-label">Total Salary</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${Math.round(averageSalary).toLocaleString()} ETB</div>
            <div class="metric-label">Average Salary</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${totalDeductions.toLocaleString()} ETB</div>
            <div class="metric-label">Total Deductions</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${totalBonuses.toLocaleString()} ETB</div>
            <div class="metric-label">Total Bonuses</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>🎯 Performance Distribution</h2>
        <div class="chart-container">
          <div style="margin-bottom: 15px;">
            <strong>Top Performers (>2000 ETB):</strong> ${topPerformers.length} teachers (${Math.round(topPerformers.length/totalTeachers*100)}%)
            <div class="performance-bar">
              <div class="performance-fill top" style="width: ${topPerformers.length/totalTeachers*100}%"></div>
            </div>
          </div>
          <div style="margin-bottom: 15px;">
            <strong>Good Performers (1501-2000 ETB):</strong> ${goodPerformers.length} teachers (${Math.round(goodPerformers.length/totalTeachers*100)}%)
            <div class="performance-bar">
              <div class="performance-fill good" style="width: ${goodPerformers.length/totalTeachers*100}%"></div>
            </div>
          </div>
          <div style="margin-bottom: 15px;">
            <strong>Average Performers (1001-1500 ETB):</strong> ${averagePerformers.length} teachers (${Math.round(averagePerformers.length/totalTeachers*100)}%)
            <div class="performance-bar">
              <div class="performance-fill average" style="width: ${averagePerformers.length/totalTeachers*100}%"></div>
            </div>
          </div>
          <div style="margin-bottom: 15px;">
            <strong>Below Average (≤1000 ETB):</strong> ${lowPerformers.length} teachers (${Math.round(lowPerformers.length/totalTeachers*100)}%)
            <div class="performance-bar">
              <div class="performance-fill low" style="width: ${lowPerformers.length/totalTeachers*100}%"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>⚠️ Deduction Analysis</h2>
        <div class="summary-stats">
          <div class="metric-card">
            <div class="metric-value">${noDeductions.length}</div>
            <div class="metric-label">No Deductions</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${lowDeductions.length}</div>
            <div class="metric-label">Low (1-50 ETB)</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${mediumDeductions.length}</div>
            <div class="metric-label">Medium (51-100 ETB)</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${highDeductions.length}</div>
            <div class="metric-label">High (>100 ETB)</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>🏆 Top 10 Performers</h2>
        <div class="chart-container">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Teacher Name</th>
                <th>Total Salary</th>
                <th>Students</th>
                <th>Deductions</th>
                <th>Bonuses</th>
              </tr>
            </thead>
            <tbody>
              ${teachers
                .sort((a, b) => b.totalSalary - a.totalSalary)
                .slice(0, 10)
                .map((teacher, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${teacher.name}</td>
                    <td>${teacher.totalSalary.toLocaleString()} ETB</td>
                    <td>${teacher.numStudents || 0}</td>
                    <td>${teacher.latenessDeduction.toLocaleString()} ETB</td>
                    <td>${teacher.bonuses.toLocaleString()} ETB</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="section">
        <h2>📊 Statistical Summary</h2>
        <div class="chart-container">
          <div class="summary-stats">
            <div class="metric-card">
              <div class="metric-value">${Math.max(...teachers.map(t => t.totalSalary)).toLocaleString()} ETB</div>
              <div class="metric-label">Highest Salary</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${Math.min(...teachers.map(t => t.totalSalary)).toLocaleString()} ETB</div>
              <div class="metric-label">Lowest Salary</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${Math.round(totalDeductions/totalTeachers)} ETB</div>
              <div class="metric-label">Avg Deduction</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${Math.round(totalBonuses/totalTeachers)} ETB</div>
              <div class="metric-label">Avg Bonus</div>
            </div>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin-top: 40px; color: #666; font-size: 12px;">
        <p>© 2025 Darulkubra Quran Academy - Teacher Payment Analytics System</p>
      </div>
    </body>
    </html>
  `;
}