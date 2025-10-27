import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const comparison = {
      title: "Salary Calculator: Old vs New - Comprehensive Analysis",
      summary: {
        oldCalculator: "Assignment-Based Salary Calculator",
        newCalculator: "Zoom Link-Based Salary Calculator",
        keyDifference: "Source of Truth for Teaching Activity",
      },
      detailedComparison: {
        studentDiscovery: {
          old: {
            method: "Current Assignment + Historical Audit Logs",
            process: [
              "1. Check current student assignments in wpos_wpdatatable_23",
              "2. Look for teacher_change_history records",
              "3. Fallback to zoom links only if no assignments found",
              "4. Complex logic with multiple fallback mechanisms",
            ],
            issues: [
              "❌ Misses students when assignments are incorrect",
              "❌ Doesn't prioritize actual teaching activity",
              "❌ Complex fallback logic can fail",
              "❌ Relies on formal assignments over reality",
            ],
          },
          new: {
            method: "Zoom Links as Primary Source",
            process: [
              "1. Find all zoom links sent by teacher in period",
              "2. Get student data for those zoom links",
              "3. Calculate salary based on actual teaching days",
              "4. Simple, direct approach",
            ],
            benefits: [
              "✅ Pays based on who actually taught",
              "✅ Handles teacher changes automatically",
              "✅ Simple, reliable logic",
              "✅ Focuses on teaching activity, not assignments",
            ],
          },
        },
        salaryCalculation: {
          old: {
            approach: "Assignment-Based Calculation",
            logic: [
              "1. Find students assigned to teacher",
              "2. Check if teacher is 'old_teacher' or 'new_teacher'",
              "3. Calculate based on assignment periods",
              "4. Complex period handling with teacher changes",
            ],
            problems: [
              "❌ Pays wrong teacher if assignment is incorrect",
              "❌ Misses teaching when assignments don't match reality",
              "❌ Complex period calculations can fail",
              "❌ Doesn't account for informal teaching arrangements",
            ],
          },
          new: {
            approach: "Activity-Based Calculation",
            logic: [
              "1. Find all zoom links sent by teacher",
              "2. Calculate unique teaching days from zoom dates",
              "3. Apply package-based daily rates",
              "4. Simple, direct calculation",
            ],
            advantages: [
              "✅ Pays the teacher who actually taught",
              "✅ Accounts for all teaching activity",
              "✅ Simple calculation logic",
              "✅ Handles any teaching arrangement",
            ],
          },
        },
        teacherChangeHandling: {
          old: {
            method: "Complex Assignment Tracking",
            process: [
              "1. Check teacher_change_history table",
              "2. Determine 'old_teacher' vs 'new_teacher' roles",
              "3. Calculate periods based on change dates",
              "4. Complex logic for overlapping periods",
            ],
            issues: [
              "❌ Requires accurate assignment records",
              "❌ Complex period calculations",
              "❌ Can miss teaching if records are wrong",
              "❌ Doesn't handle informal arrangements",
            ],
          },
          new: {
            method: "Zoom Link Activity Tracking",
            process: [
              "1. Find all zoom links sent by teacher",
              "2. Calculate teaching days from zoom dates",
              "3. Apply appropriate daily rates",
              "4. Simple, activity-based approach",
            ],
            benefits: [
              "✅ Works regardless of assignment records",
              "✅ Simple, reliable calculation",
              "✅ Handles any teaching scenario",
              "✅ Focuses on actual teaching activity",
            ],
          },
        },
        dataReliability: {
          old: {
            dependencies: [
              "wpos_wpdatatable_23.ustaz field (current assignment)",
              "teacher_change_history table (assignment changes)",
              "wpos_zoom_links table (as fallback only)",
            ],
            reliability: "Medium - Depends on accurate assignment records",
            failurePoints: [
              "❌ Incorrect ustaz assignments",
              "❌ Missing teacher_change_history records",
              "❌ Complex fallback logic failures",
            ],
          },
          new: {
            dependencies: [
              "wpos_zoom_links table (primary source)",
              "wpos_wpdatatable_23 table (student package info)",
              "package_salary table (daily rates)",
            ],
            reliability: "High - Based on actual teaching activity",
            advantages: [
              "✅ Zoom links are factual teaching records",
              "✅ Simple dependency chain",
              "✅ Reliable data source",
            ],
          },
        },
      },
      realWorldImpact: {
        scenario1: {
          title: "Teacher Assignment Mismatch",
          description:
            "Teacher A is assigned to Student X, but Teacher B actually teaches Student X",
          oldCalculator: {
            result: "Teacher A gets paid (wrong teacher)",
            reason: "Based on formal assignment",
            impact: "Teacher B works for free",
          },
          newCalculator: {
            result: "Teacher B gets paid (correct teacher)",
            reason: "Based on zoom links sent",
            impact: "Fair compensation for actual work",
          },
        },
        scenario2: {
          title: "Teacher Change During Period",
          description:
            "Teacher A teaches Student X for first half, Teacher B for second half",
          oldCalculator: {
            result: "Complex period calculation, may miss some teaching",
            reason: "Depends on accurate teacher_change_history",
            impact: "Potential underpayment",
          },
          newCalculator: {
            result: "Both teachers paid for their actual teaching days",
            reason: "Based on their respective zoom links",
            impact: "Accurate payment for all teaching",
          },
        },
        scenario3: {
          title: "Informal Teaching Arrangement",
          description:
            "Teacher A covers for Teacher B without formal assignment change",
          oldCalculator: {
            result: "Teacher A gets nothing",
            reason: "No formal assignment record",
            impact: "Unpaid work",
          },
          newCalculator: {
            result: "Teacher A gets paid",
            reason: "Zoom links show actual teaching",
            impact: "Fair compensation",
          },
        },
      },
      technicalComparison: {
        codeComplexity: {
          old: {
            rating: "High",
            reasons: [
              "Complex student discovery logic",
              "Multiple fallback mechanisms",
              "Teacher change period calculations",
              "Assignment-based salary logic",
            ],
          },
          new: {
            rating: "Low",
            reasons: [
              "Simple zoom link query",
              "Direct salary calculation",
              "Minimal fallback logic",
              "Activity-based approach",
            ],
          },
        },
        performance: {
          old: {
            rating: "Slower",
            reasons: [
              "Multiple database queries",
              "Complex join operations",
              "Fallback logic execution",
              "Period calculation overhead",
            ],
          },
          new: {
            rating: "Faster",
            reasons: [
              "Single zoom link query",
              "Simple calculations",
              "Minimal database operations",
              "Direct data processing",
            ],
          },
        },
        maintainability: {
          old: {
            rating: "Difficult",
            reasons: [
              "Complex logic flow",
              "Multiple code paths",
              "Hard to debug issues",
              "Assignment dependency",
            ],
          },
          new: {
            rating: "Easy",
            reasons: [
              "Simple logic flow",
              "Single code path",
              "Easy to debug",
              "Activity-based logic",
            ],
          },
        },
      },
      businessImpact: {
        fairness: {
          old: "Unfair - Pays based on assignments, not work",
          new: "Fair - Pays based on actual teaching activity",
        },
        accuracy: {
          old: "Inaccurate - Can pay wrong teachers",
          new: "Accurate - Pays teachers who actually taught",
        },
        reliability: {
          old: "Unreliable - Depends on assignment accuracy",
          new: "Reliable - Based on factual teaching records",
        },
        transparency: {
          old: "Complex - Hard to understand calculations",
          new: "Transparent - Clear activity-based calculations",
        },
      },
      recommendations: {
        immediate: [
          "✅ Deploy the improved salary calculator",
          "✅ Use zoom links as the source of truth",
          "✅ Pay teachers based on actual teaching activity",
        ],
        longTerm: [
          "📊 Monitor salary calculation accuracy",
          "🔄 Consider updating assignment records to match reality",
          "📈 Track teacher satisfaction with fair compensation",
        ],
      },
      conclusion: {
        summary:
          "The new salary calculator represents a fundamental shift from assignment-based to activity-based compensation",
        keyBenefits: [
          "Fair compensation for actual teaching work",
          "Simplified and more reliable calculations",
          "Better handling of teacher changes and informal arrangements",
          "Improved accuracy and transparency",
        ],
        impact:
          "This change will ensure teachers are paid fairly for their actual teaching activity, regardless of formal assignment records",
      },
    };

    return NextResponse.json({
      success: true,
      data: comparison,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating comparison discussion:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
