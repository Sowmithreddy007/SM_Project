package com.specanciens.socialdesk.post;

import com.specanciens.socialdesk.audit.AuditEventDto;
import com.specanciens.socialdesk.review.ReviewDtos.ReviewDto;
import com.specanciens.socialdesk.user.UserDtos.UserOptionDto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public final class PostDtos {

    private PostDtos() {
    }

    public record PostSummaryDto(
            UUID id,
            String title,
            PostType postType,
            Set<Platform> platforms,
            LocalDate publishDate,
            PostStatus status,
            UserOptionDto assignee,
            String driveUrl,
            String captionPreview,
            String postedUrl,
            int reviewRound,
            Instant updatedAt
    ) {
    }

    public record PostDetailDto(
            UUID id,
            String title,
            PostType postType,
            Set<Platform> platforms,
            LocalDate publishDate,
            PostStatus status,
            UserOptionDto assignee,
            UserOptionDto createdBy,
            String driveUrl,
            String caption,
            String notes,
            String postedUrl,
            Instant postedAt,
            int reviewRound,
            Instant createdAt,
            Instant updatedAt,
            List<ReviewDto> reviews,
            List<AuditEventDto> audit
    ) {
    }

    public record PostRequest(
            @NotBlank @Size(max = 180) String title,
            @NotNull PostType postType,
            @NotEmpty Set<Platform> platforms,
            @NotNull LocalDate publishDate,
            @NotNull UUID assigneeId,
            @NotBlank @Size(max = 1000)
            @Pattern(regexp = "^https?://.+", message = "Enter a valid http(s) URL.") String driveUrl,
            @NotBlank @Size(max = 10000) String caption,
            @Size(max = 2000) String notes
    ) {
    }

    public record MarkPostedRequest(
            @Size(max = 1000)
            @Pattern(regexp = "^$|^https?://.+", message = "Enter a valid http(s) URL.") String postedUrl
    ) {
    }

    public record ReopenRequest(
            @NotBlank @Size(max = 1000) String reason
    ) {
    }

    public record CancelRequest(
            @Size(max = 1000) String reason
    ) {
    }
}
