import { env } from '../../config/env';

interface TermiiSendPayload {
    to: string;
    from: string;
    sms: string;
    type: string;
    channel: string; // 'dnd' or 'generic'
    api_key: string;
}

/**
 * Send an SMS using the Termii API.
 * 
 * @param to The recipient's mobile number
 * @param message The text message content
 * @param channel The routing channel (default 'generic'. 'dnd' is recommended for transactional)
 * @param senderId The sender ID (must be approved on Termii, e.g., 'NOLTFINANCE')
 */
export async function sendSms(
    to: string,
    message: string,
    channel: 'dnd' | 'generic' = 'generic',
    senderId: string = 'NOLTFINANCE'
) {
    if (env.NODE_ENV === 'test') {
        console.log(`[TEST] SMS to ${to} via ${channel} from ${senderId}: ${message}`);
        return;
    }

    // Termii requires numbers without the '+' sign
    const formattedTo = to.replace(/\D/g, '');

    const payload: TermiiSendPayload = {
        to: formattedTo,
        from: senderId,
        sms: message,
        type: 'plain',
        channel,
        api_key: env.TERMII_API_KEY,
    };

    // Support timeouts for unreliable SMS gateways (20 seconds)
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 20000);

    try {
        const response = await fetch('https://api.ng.termii.com/api/sms/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: abortController.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Termii SMS Error Response:', errorText);
            throw new Error(`Failed to send SMS: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Termii can return an OK HTTP status but still fail processing (e.g. invalid sender ID, insufficient balance)
        // Usually checked by `data.message` or `data.code`.  A successful response code is typically 'ok' or a valid message id.
        if (data.message && typeof data.message === 'string' && data.message.toLowerCase().includes('fail')) {
            console.error('Termii SMS API Warning/Failure:', data);
            throw new Error(`Termii API returned a failure message: ${data.message}`);
        }

        console.log(`SMS sent successfully to ${to}. Message ID: ${data.message_id || 'N/A'}`);
        return data;
    } catch (error) {
        console.error(`Termii SMS Exception for ${to}:`, error);
        throw error;
    }
}
