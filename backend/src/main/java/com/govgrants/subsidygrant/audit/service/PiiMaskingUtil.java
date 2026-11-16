package com.govgrants.subsidygrant.audit.service;

/**
 * Static utility that masks PII fields before they are serialized into audit
 * {@code old_value} / {@code new_value} JSONB columns.
 *
 * <p>{@code full_name} is NOT masked (it is not considered sensitive enough to
 * hide in audit context). {@code national_id_hash} and {@code bank_account_enc}
 * never appear in audit values — they are excluded at the source by the calling
 * service.
 *
 * AC-AUD-01.2, INV-07
 */
public final class PiiMaskingUtil {

    private PiiMaskingUtil() {
        // utility class — no instances
    }

    /**
     * Masks an email address: {@code "john.doe@example.com" → "j***@example.com"}.
     * Keeps the first character of the local part, replaces the rest with {@code ***},
     * and preserves the full domain.
     *
     * @param email the plaintext email, or null
     * @return the masked email, or null if the input was null
     */
    public static String maskEmail(String email) {
        if (email == null || email.isBlank()) {
            return email;
        }
        int atIndex = email.indexOf('@');
        if (atIndex <= 0) {
            // malformed or no local part — mask everything
            return "***";
        }
        String localPart = email.substring(0, atIndex);
        String domain = email.substring(atIndex); // includes '@'
        if (localPart.isEmpty()) {
            return "***" + domain;
        }
        return localPart.charAt(0) + "***" + domain;
    }

    /**
     * Masks a phone number: {@code "9876543210" → "XXXXXX3210"}.
     * Shows only the last 4 digits; everything else becomes {@code X}.
     *
     * @param phone the plaintext phone number, or null
     * @return the masked phone, or null if the input was null
     */
    public static String maskPhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return phone;
        }
        if (phone.length() <= 4) {
            return "X".repeat(phone.length());
        }
        int maskLen = phone.length() - 4;
        return "X".repeat(maskLen) + phone.substring(maskLen);
    }
}
