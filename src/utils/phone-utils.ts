/**
 * Normalizes phone numbers to a standard format (234...) for reliable lookup.
 * Handles: +234, leading 0, and plain 10-digit numbers.
 */
export function normalizePhoneNumber(phone: string | null | undefined): string {
    if (!phone) return "";

    // 1. Remove all non-numeric characters
    let cleaned = String(phone).replace(/\D/g, '');

    // 2. Handle Nigerian numbers (+234, 0..., 8...)
    if (cleaned.startsWith('234')) {
        // If it mistakenly has a 0 after 234 (e.g. 2340810...)
        if (cleaned.startsWith('2340') && cleaned.length === 14) {
            return '234' + cleaned.substring(4);
        }
        return cleaned;
    }

    if (cleaned.startsWith('0') && cleaned.length === 11) {
        return '234' + cleaned.substring(1);
    }

    if ((cleaned.startsWith('7') || cleaned.startsWith('8') || cleaned.startsWith('9')) && cleaned.length === 10) {
        return '234' + cleaned;
    }

    return cleaned;
}

/**
 * Normalizes an identifier (Email or Phone).
 */
export function normalizeIdentifier(id: string | null | undefined): string {
    if (!id) return "";
    const trimmed = id.trim();
    if (trimmed.includes('@')) {
        return trimmed.toLowerCase();
    }
    return normalizePhoneNumber(trimmed);
}
