import { Resend } from "resend";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WeeklySummaryData {
  userName: string;
  weekNumber: number;
  phase: string;
  sessionsCompleted: number;
  averageScore: number;
  bestScore: number;
  totalPracticeMinutes: number;
  topStrength: string;
  focusArea: string;
  scoreChange: number;
  streakDays: number;
  phaseProgress: number; // 0-100
}

// ─── Client ──────────────────────────────────────────────────────────────────

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(apiKey);
}

// ─── Email Template ──────────────────────────────────────────────────────────

function buildWeeklySummaryHtml(data: WeeklySummaryData): string {
  const scoreColor =
    data.averageScore >= 85
      ? "#10B981"
      : data.averageScore >= 70
        ? "#3B82F6"
        : data.averageScore >= 55
          ? "#F59E0B"
          : "#EF4444";

  const changeArrow = data.scoreChange >= 0 ? "↑" : "↓";
  const changeColor = data.scoreChange >= 0 ? "#10B981" : "#EF4444";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#ffffff;font-size:24px;margin:0 0 8px;">Stage Academy</h1>
      <p style="color:#a1a1aa;font-size:14px;margin:0;">Weekly Performance Summary</p>
    </div>

    <!-- Main Card -->
    <div style="background-color:#18181b;border-radius:12px;border:1px solid #27272a;padding:32px;margin-bottom:24px;">

      <p style="color:#a1a1aa;font-size:14px;margin:0 0 4px;">Hey ${data.userName},</p>
      <h2 style="color:#ffffff;font-size:20px;margin:0 0 24px;">Here's your Week ${data.weekNumber} recap</h2>

      <!-- Phase Badge -->
      <div style="display:inline-block;background-color:#27272a;border-radius:20px;padding:6px 16px;margin-bottom:24px;">
        <span style="color:#a1a1aa;font-size:12px;">Phase:</span>
        <span style="color:#ffffff;font-size:12px;font-weight:600;margin-left:4px;">${data.phase}</span>
      </div>

      <!-- Score Section -->
      <div style="text-align:center;margin-bottom:32px;">
        <p style="color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Average Score</p>
        <p style="color:${scoreColor};font-size:48px;font-weight:700;margin:0;line-height:1;">
          ${data.averageScore.toFixed(1)}
        </p>
        <p style="color:${changeColor};font-size:14px;margin:4px 0 0;">
          ${changeArrow} ${Math.abs(data.scoreChange).toFixed(1)} from last week
        </p>
      </div>

      <!-- Stats Grid -->
      <div style="display:flex;gap:12px;margin-bottom:24px;">
        <div style="flex:1;background-color:#27272a;border-radius:8px;padding:16px;text-align:center;">
          <p style="color:#a1a1aa;font-size:11px;margin:0 0 4px;">Sessions</p>
          <p style="color:#ffffff;font-size:20px;font-weight:600;margin:0;">${data.sessionsCompleted}/7</p>
        </div>
        <div style="flex:1;background-color:#27272a;border-radius:8px;padding:16px;text-align:center;">
          <p style="color:#a1a1aa;font-size:11px;margin:0 0 4px;">Best Score</p>
          <p style="color:#ffffff;font-size:20px;font-weight:600;margin:0;">${data.bestScore.toFixed(1)}</p>
        </div>
        <div style="flex:1;background-color:#27272a;border-radius:8px;padding:16px;text-align:center;">
          <p style="color:#a1a1aa;font-size:11px;margin:0 0 4px;">Practice</p>
          <p style="color:#ffffff;font-size:20px;font-weight:600;margin:0;">${data.totalPracticeMinutes}m</p>
        </div>
      </div>

      <!-- Streak -->
      <div style="background-color:#27272a;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
        <p style="color:#a1a1aa;font-size:11px;margin:0 0 4px;">Current Streak</p>
        <p style="color:#F59E0B;font-size:24px;font-weight:700;margin:0;">${data.streakDays} days</p>
      </div>

      <!-- Highlights -->
      <div style="margin-bottom:24px;">
        <h3 style="color:#ffffff;font-size:14px;margin:0 0 12px;">Highlights</h3>
        <div style="background-color:#27272a;border-radius:8px;padding:12px 16px;margin-bottom:8px;border-left:3px solid #10B981;">
          <p style="color:#a1a1aa;font-size:11px;margin:0 0 2px;">Top Strength</p>
          <p style="color:#ffffff;font-size:14px;margin:0;">${data.topStrength}</p>
        </div>
        <div style="background-color:#27272a;border-radius:8px;padding:12px 16px;border-left:3px solid #3B82F6;">
          <p style="color:#a1a1aa;font-size:11px;margin:0 0 2px;">Focus Area</p>
          <p style="color:#ffffff;font-size:14px;margin:0;">${data.focusArea}</p>
        </div>
      </div>

      <!-- Progress Bar -->
      <div style="margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <p style="color:#a1a1aa;font-size:12px;margin:0;">Phase Progress</p>
          <p style="color:#ffffff;font-size:12px;margin:0;">${data.phaseProgress}%</p>
        </div>
        <div style="background-color:#27272a;border-radius:4px;height:8px;overflow:hidden;">
          <div style="background:linear-gradient(90deg,#3B82F6,#8B5CF6);height:100%;width:${data.phaseProgress}%;border-radius:4px;"></div>
        </div>
      </div>

    </div>

    <!-- Footer -->
    <div style="text-align:center;">
      <p style="color:#52525b;font-size:12px;margin:0;">
        Stage Academy &middot; Master the Art of Public Speaking
      </p>
    </div>

  </div>
</body>
</html>`;
}

// ─── Send Email ──────────────────────────────────────────────────────────────

/**
 * Send a weekly summary email with a dark-themed HTML template.
 */
export async function sendWeeklySummaryEmail(
  to: string,
  data: WeeklySummaryData
): Promise<{ id: string }> {
  const resend = getResendClient();
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "noreply@stageacademy.com";

  const result = await resend.emails.send({
    from: `Stage Academy <${fromEmail}>`,
    to,
    subject: `Your Week ${data.weekNumber} Performance Summary - Stage Academy`,
    html: buildWeeklySummaryHtml(data),
  });

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }

  return { id: result.data?.id || "" };
}
