"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBulkEmail = sendBulkEmail;
const env_1 = require("../../config/env");
async function sendBulkEmail(to, subject, htmlContent, preheader = '', fromName, fromEmail) {
    // Professional Nolt Finance Template
    const wrapper = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); overflow: hidden; }
            .header { background: #0f172a; color: #ffffff; padding: 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px; }
            .content { padding: 40px; color: #334155; line-height: 1.7; font-size: 16px; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; }
            .footer p { margin: 5px 0; }
        </style>
    </head>
    <body>
        <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
            ${preheader}
        </div>
        <div class="container">
            <div class="header">
                <h1>Nolt Finance</h1>
            </div>
            <div class="content">
                ${htmlContent}
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Nolt Finance. All rights reserved.</p>
                <p>You are receiving this email because you are a customer of Nolt Finance.</p>
            </div>
        </div>
    </body>
    </html>
    `;
    if (env_1.env.NODE_ENV === 'test') {
        console.log(`[TEST] Bulk Email to ${to}: ${subject}`);
        return;
    }
    const payload = {
        to: [
            {
                email_address: {
                    address: to,
                    name: to.split('@')[0],
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
                Authorization: env_1.env.ZEPTO_BULK_TOKEN,
            },
            body: JSON.stringify({
                from: {
                    address: fromEmail || env_1.env.ZEPTO_FROM_EMAIL,
                    name: fromName || "Nolt Finance"
                },
                ...payload,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('ZeptoMail Bulk Error:', errorText);
            throw new Error(`Failed to send bulk email: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Bulk email sent successfully:', data);
    }
    catch (error) {
        console.error('Bulk email sending failed:', error);
        throw error;
    }
}
