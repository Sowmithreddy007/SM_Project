package com.specanciens.socialdesk.review;

import com.specanciens.socialdesk.config.AppProperties;
import com.specanciens.socialdesk.post.Platform;
import com.specanciens.socialdesk.post.Post;
import com.specanciens.socialdesk.user.AppUser;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class GmailComposer {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH);

    private final AppProperties appProperties;

    public GmailComposer(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    public EmailDraft compose(UUID reviewRequestId, Post post, AppUser requestedBy,
                              String recipientEmail, String recipientName) {
        String baseUrl = appProperties.baseUrl() == null
                ? "http://localhost:5173"
                : appProperties.baseUrl().replaceAll("/+$", "");
        String reviewUrl = baseUrl + "/review/" + reviewRequestId;
        String subject = "Review request — " + post.getTitle() + " — " + DATE.format(post.getPublishDate());

        String platforms = post.getPlatforms().stream()
                .sorted(Comparator.comparingInt(Platform::ordinal))
                .map(Platform::name)
                .map(this::displayPlatform)
                .collect(Collectors.joining(", "));

        String greeting = recipientName == null || recipientName.isBlank()
                ? "Hi,"
                : "Hi " + recipientName + ",";

        String body = """
                %s

                Please review the following post for SPECANCIENS.

                Post: %s
                Type: %s
                Planned date: %s
                Assigned to: %s
                Platforms: %s
                Drive link: %s

                Open the review page:
                %s

                Caption preview:
                %s

                Thanks,
                %s
                """.formatted(
                greeting,
                post.getTitle(),
                displayType(post.getPostType().name()),
                DATE.format(post.getPublishDate()),
                post.getAssignee().getFullName(),
                platforms,
                post.getDriveUrl(),
                reviewUrl,
                preview(post.getCaption()),
                requestedBy.getFullName()
        );

        String gmailUrl = gmailUrl(recipientEmail, subject, body);

        return new EmailDraft(recipientEmail, subject, body, reviewUrl, gmailUrl);
    }

    public String gmailUrl(String recipientEmail, String subject, String body) {
        return "https://mail.google.com/mail/?view=cm&fs=1"
                + "&to=" + encode(recipientEmail)
                + "&su=" + encode(subject)
                + "&body=" + encode(body);
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String preview(String caption) {
        String oneLine = caption.replaceAll("\\s+", " ").trim();
        return oneLine.length() <= 600 ? oneLine : oneLine.substring(0, 597) + "...";
    }

    private String displayType(String type) {
        return switch (type) {
            case "POST" -> "Post";
            case "REEL" -> "Reel";
            case "STORY" -> "Story";
            default -> "Other";
        };
    }

    private String displayPlatform(String platform) {
        return switch (platform) {
            case "INSTAGRAM" -> "Instagram";
            case "FACEBOOK" -> "Facebook";
            case "LINKEDIN" -> "LinkedIn";
            default -> platform;
        };
    }
}
