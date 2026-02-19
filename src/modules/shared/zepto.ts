import { env } from '../../config/env';

interface EmailPayload {
    to: { email_address: { address: string; name: string } }[];
    subject: string;
    htmlbody: string;
}

export async function sendEmail(to: string, subject: string, htmlContent: string) {
    // Basic HTML Wrapper for professional look
    const wrapper = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
            .header { background: #4F46E5; color: #ffffff; padding: 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px; color: #333333; line-height: 1.6; }
            .footer { background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #666666; }
            .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4F46E5; text-align: center; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>HRIS Pro</h1>
            </div>
            <div class="content">
                ${htmlContent}
            </div>
            <div class="footer">
                &copy; ${new Date().getFullYear()} HRIS Pro. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    `;

    if (env.NODE_ENV === 'test') {
        console.log(`[TEST] Email to ${to}: ${subject}`);
        return;
    }

    const payload: EmailPayload = {
        to: [
            {
                email_address: {
                    address: to,
                    name: to.split('@')[0], // Extract name from email
                },
            },
        ],
        subject,
        htmlbody: wrapper,
    };

    try {
        const response = await fetch('https://api.zeptomail.com/v1.1/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: env.ZEPTO_TOKEN,
            },
            body: JSON.stringify({
                from: { address: env.ZEPTO_FROM_EMAIL, name: "HRIS Pro System" },
                ...payload,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ZeptoMail Error:', errorText);
            throw new Error(`Failed to send email: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Email sent successfully:', data);
    } catch (error) {
        console.error('Email sending failed:', error);
        // In production, we might want to throw or queue a retry.
        // For now, logging is enough.
    }
};
