package com.specanciens.socialdesk.review;

public record EmailDraft(
        String recipientEmail,
        String subject,
        String body,
        String reviewUrl,
        String gmailComposeUrl
) {
}
