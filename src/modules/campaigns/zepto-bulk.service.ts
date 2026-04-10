import { env } from '../../config/env';

interface EmailPayload {
    to: { email_address: { address: string; name: string } }[];
    subject: string;
    htmlbody: string;
}

export async function sendBulkEmail(
    to: string,
    subject: string,
    htmlContent: string,
    preheader: string = '',
    fromName?: string,
    fromEmail?: string
) {
    // Send the content directly as provided in the campaign template
    const htmlbody = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
    </head>
    <body style="margin: 0; padding: 0;">
        <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
            ${preheader}
        </div>
        ${htmlContent}
    </body>
    </html>
    `;

    if (env.NODE_ENV === 'test') {
        console.log(`[TEST] Bulk Email to ${to}: ${subject}`);
        return;
    }

    const payload: EmailPayload = {
        to: [
            {
                email_address: {
                    address: to,
                    name: to.split('@')[0],
                },
            },
        ],
        subject,
        htmlbody: htmlbody,
    };

    try {
        const response = await fetch('https://api.zeptomail.com/v1.1/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: env.ZEPTO_BULK_TOKEN,
            },
            body: JSON.stringify({
                from: {
                    address: fromEmail || env.ZEPTO_FROM_EMAIL,
                    name: fromName || "NOLT Finance"
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
    } catch (error) {
        console.error('Bulk email sending failed:', error);
        throw error;
    }
}
