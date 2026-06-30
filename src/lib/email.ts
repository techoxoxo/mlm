export async function sendOtpEmail(email: string, otp: string): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@revolutionary-group.com";
  const senderName = process.env.BREVO_SENDER_NAME || "Revolutionary Income Plan";

  console.log(`[EMAIL DISPATCH] Target: ${email} | Verification Code: ${otp}`);

  if (!apiKey) {
    console.warn("BREVO_API_KEY is not set in environmental variables. Skipping API dispatch. (OTP is printed above for local debugging).");
    return true;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: email }],
        subject: "Verify your email address - Revolutionary Income Plan",
        htmlContent: `
          <div style="background-color: #0c0a08; padding: 40px 20px; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-align: center; color: #f5f0e8;">
            <div style="max-width: 520px; margin: 0 auto; background: #13110d; border: 1px solid rgba(248,198,23,0.15); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.45);">
              
              <!-- Header / Logo -->
              <div style="background: linear-gradient(180deg, rgba(248,198,23,0.06) 0%, rgba(248,198,23,0) 100%); padding: 32px 24px; border-bottom: 1px solid rgba(248,198,23,0.08);">
                <div style="display: inline-block; background: #ffffff; border-radius: 12px; padding: 8px; width: 48px; height: 48px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                  <img src="${process.env.NEXT_PUBLIC_APP_URL}/images/rv_mlm.png" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;" />
                </div>
                <h1 style="font-size: 20px; font-weight: 800; color: #cc9f0e; margin: 16px 0 0; letter-spacing: -0.02em; text-transform: uppercase;">
                  Revolutionary Income Plan
                </h1>
                <p style="font-size: 12px; color: #a89060; margin: 4px 0 0; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;">
                  Email Verification
                </p>
              </div>

              <!-- Body Content -->
              <div style="padding: 40px 32px;">
                <p style="font-size: 15px; line-height: 1.6; color: #a89060; margin: 0 0 24px; font-weight: 500;">
                  Welcome to the matrix. To activate your registration profile, please confirm your email address by entering this one-time passcode:
                </p>

                <!-- Passcode Display -->
                <div style="background: rgba(204,159,14,0.04); border: 1px dashed rgba(204,159,14,0.3); border-radius: 14px; padding: 22px 10px; margin: 24px 0;">
                  <span style="font-family: ui-monospace, 'Courier New', monospace; font-size: 38px; font-weight: 800; color: #f8c617; letter-spacing: 10px; padding-left: 10px;">
                    ${otp}
                  </span>
                </div>

                <p style="font-size: 13px; color: #5a4a2a; line-height: 1.5; margin: 24px 0 0;">
                  This code expires in <b>15 minutes</b>.<br/>
                  For security, never share this code with anyone.
                </p>
              </div>

              <!-- Footer -->
              <div style="background: #090806; padding: 24px; border-top: 1px solid rgba(248,198,23,0.05); font-size: 11px; color: #5a4a2a; line-height: 1.5;">
                <p style="margin: 0 0 8px;">Sent securely by Revolutionary Income Plan</p>
                <p style="margin: 0;">If you did not initiate this request, you can safely ignore this mail.</p>
              </div>

            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Brevo API Error: Status ${response.status} | Details: ${errText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to dispatch email via Brevo:", error);
    return false;
  }
}
