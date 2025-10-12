import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  try {
    // Find the zoom link by token
    const zoomLink = await prisma.wpos_zoom_links.findFirst({
      where: { tracking_token: token },
    });

    if (!zoomLink) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    // Update session tracking fields
    await prisma.wpos_zoom_links.update({
      where: { id: zoomLink.id },
      data: {
        clicked_at: new Date(),
        session_status: "active",
        last_activity_at: new Date(),
      },
    });

    // Add leave URL to Zoom link so it redirects back when meeting ends
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      request.headers.get("origin") ||
      "http://localhost:3000";
    const leaveUrl = `${baseUrl}/api/zoom/session-complete?token=${token}`;

    // Append leave_url parameter to Zoom link
    const zoomUrl = zoomLink.link.includes("?")
      ? `${zoomLink.link}&leave_url=${encodeURIComponent(leaveUrl)}`
      : `${zoomLink.link}?leave_url=${encodeURIComponent(leaveUrl)}`;

    console.log(
      `🔗 Enhanced Zoom URL with leave redirect: ${zoomUrl.substring(
        0,
        100
      )}...`
    );

    // Return enhanced tracking page with mobile compatibility
    const trackingPage = `
<!DOCTYPE html>
<html>
<head>
    <title>Connecting to Zoom...</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 20px; 
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 30px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .spinner { 
            border: 4px solid rgba(255, 255, 255, 0.3); 
            border-top: 4px solid #fff; 
            border-radius: 50%; 
            width: 50px; 
            height: 50px; 
            animation: spin 1s linear infinite; 
            margin: 20px auto; 
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        h2 { margin: 0 0 10px 0; font-size: 24px; }
        p { margin: 0; font-size: 16px; opacity: 0.9; }
        .countdown { font-size: 18px; margin-top: 15px; font-weight: bold; }
        @media (max-width: 480px) {
            .container { padding: 20px; margin: 10px; }
            h2 { font-size: 20px; }
            p { font-size: 14px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>🔗 Connecting to Zoom...</h2>
        <div class="spinner"></div>
        <p>Please wait while we connect you to the session.</p>
        <div class="countdown" id="countdown">Redirecting in 5 seconds...</div>
    </div>
    
    <script>
        const token = "${token}";
        const zoomUrl = "${zoomUrl.replace(/"/g, '\\"')}";
        let sessionStartTime = new Date();
        let heartbeatInterval;
        let redirectTimeout;
        let countdownInterval;
        let isSessionEnded = false;
        let hasRedirected = false;
        let countdown = 5;
        
        // Enhanced heartbeat function with retry logic
        function sendHeartbeat() {
            fetch('/api/zoom/heartbeat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            }).catch(error => {
                console.log('Heartbeat failed:', error);
                // Don't end session on heartbeat failure, just log it
            });
        }
        
        // Start heartbeat every 30 seconds
        function startHeartbeat() {
            heartbeatInterval = setInterval(sendHeartbeat, 30000);
            // Send initial heartbeat
            sendHeartbeat();
        }
        
        // Enhanced session end function
        function endSession(reason = 'user_exit') {
            if (isSessionEnded) return;
            
            const duration = Math.round((new Date() - sessionStartTime) / 60000);
            console.log('Attempting to end session:', { reason, duration });
            
            // For very short sessions (less than 1 minute), don't end immediately
            // This prevents accidental session endings during testing
            if (duration < 1 && (reason === 'beforeunload' || reason === 'unload')) {
                console.log('Session too short, not ending yet. Duration:', duration);
                return;
            }
            
            isSessionEnded = true;
            
            // Use sendBeacon for more reliable delivery on mobile
            const data = JSON.stringify({ 
                token, 
                duration, 
                endTime: new Date().toISOString(),
                reason: reason
            });
            
            if (navigator.sendBeacon) {
                navigator.sendBeacon('/api/zoom/end-session', data);
            } else {
                fetch('/api/zoom/end-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: data,
                    keepalive: true
                }).catch(() => {});
            }
            
            // Clear intervals
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            if (countdownInterval) clearInterval(countdownInterval);
            if (redirectTimeout) clearTimeout(redirectTimeout);
        }
        
        // Countdown display
        function updateCountdown() {
            const countdownEl = document.getElementById('countdown');
            if (countdown > 0) {
                if (countdownEl) {
                    countdownEl.textContent = \`Redirecting in \${countdown} seconds...\`;
                }
                countdown--;
            } else {
                if (countdownEl) {
                    countdownEl.textContent = 'Redirecting now...';
                }
                clearInterval(countdownInterval);
            }
        }
        
        // Start countdown
        countdownInterval = setInterval(updateCountdown, 1000);
        
        // Open Zoom in new tab/window after 5 seconds
        // KEEP this tracking page open for accurate duration tracking
        redirectTimeout = setTimeout(() => {
            if (!isSessionEnded) {
                console.log('Opening Zoom in new window...');
                hasRedirected = true;
                
                // Try to open Zoom in new window
                const zoomWindow = window.open(zoomUrl, '_blank', 'noopener,noreferrer');
                
                if (zoomWindow) {
                    console.log('✅ Zoom opened in new window');
                    
                    // Update UI to show session is active
                    document.querySelector('.container').innerHTML = \`
                        <div style="text-align: center;">
                            <h2 style="color: #10b981; font-size: 28px; margin-bottom: 15px;">
                                ✅ Session Active
                            </h2>
                            <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 15px; margin: 20px 0;">
                                <p style="font-size: 16px; margin-bottom: 15px;">
                                    📹 Your Zoom session is being tracked
                                </p>
                                <div style="background: rgba(255,255,255,0.3); padding: 20px; border-radius: 10px; margin: 15px 0;">
                                    <p style="font-size: 14px; margin-bottom: 8px; opacity: 0.9;">Session Duration:</p>
                                    <p id="live-duration" style="font-size: 36px; font-weight: bold; margin: 0;">0:00</p>
                                </div>
                                <div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 15px; margin-top: 15px;">
                                    <p style="font-size: 14px; font-weight: bold; color: #fbbf24; margin-bottom: 8px;">
                                        ⚠️ IMPORTANT: Keep this page open!
                                    </p>
                                    <p style="font-size: 13px; opacity: 0.8; margin-bottom: 15px;">
                                        This page tracks your session duration.<br/>
                                        Close it only after you finish your Zoom meeting.
                                    </p>
                                </div>
                            </div>
                            <button onclick="endSessionManually()" style="
                                padding: 12px 30px;
                                background: #ef4444;
                                color: white;
                                border: none;
                                border-radius: 10px;
                                font-size: 16px;
                                font-weight: bold;
                                cursor: pointer;
                                box-shadow: 0 4px 6px rgba(0,0,0,0.2);
                                transition: all 0.2s;
                            " onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">
                                🛑 End Session Now
                            </button>
                            <p style="font-size: 12px; opacity: 0.7; margin-top: 15px;">
                                Or simply close this page when your meeting ends
                            </p>
                        </div>
                    \`;
                    
                    // Start live duration counter
                    setInterval(() => {
                        const durationEl = document.getElementById('live-duration');
                        if (durationEl && !isSessionEnded) {
                            const totalSeconds = Math.floor((new Date() - sessionStartTime) / 1000);
                            const hours = Math.floor(totalSeconds / 3600);
                            const minutes = Math.floor((totalSeconds % 3600) / 60);
                            const seconds = totalSeconds % 60;
                            
                            if (hours > 0) {
                                durationEl.textContent = hours + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
                            } else {
                                durationEl.textContent = minutes + ':' + String(seconds).padStart(2, '0');
                            }
                        }
                    }, 1000);
                } else {
                    // Popup blocked - fallback to redirect
                    console.log('⚠️ Popup blocked - redirecting instead');
                    alert('⚠️ Please allow popups to track your session accurately.\\n\\nRedirecting to Zoom...');
                    window.location.href = zoomUrl;
                }
            }
        }, 5000);
        
        // Function to manually end session
        window.endSessionManually = function() {
            const duration = Math.round((new Date() - sessionStartTime) / 60000);
            if (confirm('End this session?\\n\\nDuration: ' + duration + ' minutes')) {
                endSession('manual_end');
            }
        };
        
        // Start heartbeat
        startHeartbeat();
        
        // Enhanced event listeners for better mobile compatibility
        // Only end session if user manually closes (not when redirecting to Zoom)
        window.addEventListener("beforeunload", () => {
            if (!hasRedirected) {
                endSession('beforeunload');
            }
        });
        window.addEventListener("unload", () => {
            if (!hasRedirected) {
                endSession('unload');
            }
        });
        window.addEventListener("pagehide", () => {
            if (!hasRedirected) {
                endSession('pagehide');
            }
        });
        
        // Handle visibility change (mobile app switching)
        // DON'T end session on visibility change - user is likely just opening Zoom
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                console.log('Page hidden - user likely opened Zoom or switched apps');
                // Don't end session automatically - let it stay active until user manually closes
            } else {
                console.log('Page visible again');
            }
        });
        
        // Handle focus/blur events
        window.addEventListener("blur", () => {
            console.log('Window blurred');
        });
        
        window.addEventListener("focus", () => {
            console.log('Window focused');
        });
        
        // Handle mobile-specific events
        window.addEventListener("orientationchange", () => {
            console.log('Orientation changed');
        });
        
        // Handle app state changes (mobile)
        document.addEventListener("pause", () => endSession('app_pause'), false);
        document.addEventListener("resume", () => {
            console.log('App resumed');
        }, false);
        
        // No automatic timeouts - user must close page or click "End Session" button
        // This ensures accurate duration tracking from click to actual end
        
        console.log('Session tracking initialized for token:', token);
    </script>
</body>
</html>`;

    return new NextResponse(trackingPage, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("Error in zoom track:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
