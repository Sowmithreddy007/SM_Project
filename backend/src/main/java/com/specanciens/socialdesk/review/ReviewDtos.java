package com.specanciens.socialdesk.review;

import com.specanciens.socialdesk.post.PostDtos.PostDetailDto;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class ReviewDtos {

    private ReviewDtos() {
    }

    public record ReviewDto(
            UUID id,
            int roundNumber,
            ReviewStatus status,
            String requestedByName,
            String recipientEmail,
            Instant preparedAt,
            Instant sentAt,
            Instant decidedAt,
            String decidedByName,
            String feedback
    ) {
        public static ReviewDto from(ReviewRequest review) {
            return new ReviewDto(
                    review.getId(),
                    review.getRoundNumber(),
                    review.getStatus(),
                    review.getRequestedBy() == null ? null : review.getRequestedBy().getFullName(),
                    review.getRecipientEmail(),
                    review.getPreparedAt(),
                    review.getSentAt(),
                    review.getDecidedAt(),
                    review.getDecidedBy() == null ? null : review.getDecidedBy().getFullName(),
                    review.getFeedback()
            );
        }
    }

    public record PrepareReviewResponse(
            UUID reviewRequestId,
            String recipientEmail,
            String subject,
            String body,
            String reviewUrl,
            String gmailComposeUrl,
            Instant preparedAt
    ) {
    }

    public record ReviewDecisionRequest(
            @Size(max = 4000) String feedback
    ) {
    }

    public record ReviewPageResponse(
            PostDetailDto post,
            ReviewDto review
    ) {
    }
}
