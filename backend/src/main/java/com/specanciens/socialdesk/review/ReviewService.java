package com.specanciens.socialdesk.review;

import com.specanciens.socialdesk.audit.AuditService;
import com.specanciens.socialdesk.common.BusinessException;
import com.specanciens.socialdesk.common.ForbiddenException;
import com.specanciens.socialdesk.common.NotFoundException;
import com.specanciens.socialdesk.post.Post;
import com.specanciens.socialdesk.post.PostDtos.PostDetailDto;
import com.specanciens.socialdesk.post.PostService;
import com.specanciens.socialdesk.post.PostStatus;
import com.specanciens.socialdesk.review.ReviewDtos.ReviewDecisionRequest;
import com.specanciens.socialdesk.review.ReviewDtos.ReviewDto;
import com.specanciens.socialdesk.review.ReviewDtos.ReviewPageResponse;
import com.specanciens.socialdesk.user.AppUser;
import com.specanciens.socialdesk.user.Role;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReviewService {

    private final ReviewRequestRepository reviewRepository;
    private final PostService postService;
    private final AuditService auditService;

    public ReviewService(
            ReviewRequestRepository reviewRepository,
            PostService postService,
            AuditService auditService
    ) {
        this.reviewRepository = reviewRepository;
        this.postService = postService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public ReviewPageResponse getReviewPage(UUID reviewId, AppUser currentUser) {
        assertSuperAdmin(currentUser);
        ReviewRequest review = loadReview(reviewId);
        Post post = review.getPost();
        PostDetailDto detail = postService.getDetail(post.getId());
        return new ReviewPageResponse(detail, ReviewDto.from(review));
    }

    @Transactional
    public PostDetailDto approve(UUID reviewId, ReviewDecisionRequest request, AppUser currentUser) {
        assertSuperAdmin(currentUser);
        ReviewRequest review = loadReview(reviewId);
        assertActionable(review);

        markAsSentIfNeeded(review, currentUser);
        review.setStatus(ReviewStatus.APPROVED);
        review.setDecidedAt(Instant.now());
        review.setDecidedBy(currentUser);
        review.setFeedback(blankToNull(request.feedback()));
        review.getPost().setStatus(PostStatus.APPROVED);
        auditService.record(
                review.getPost().getId(),
                currentUser,
                "REVIEW_APPROVED",
                "Round " + review.getRoundNumber() + " approved."
                        + (review.getFeedback() == null ? "" : " Feedback: " + review.getFeedback())
        );
        return postService.getDetail(review.getPost().getId());
    }

    @Transactional
    public PostDetailDto requestChanges(UUID reviewId, ReviewDecisionRequest request, AppUser currentUser) {
        assertSuperAdmin(currentUser);
        ReviewRequest review = loadReview(reviewId);
        assertActionable(review);

        String feedback = blankToNull(request.feedback());
        if (feedback == null) {
            throw new BusinessException("Please write the changes that are needed.");
        }

        markAsSentIfNeeded(review, currentUser);
        review.setStatus(ReviewStatus.CHANGES_REQUESTED);
        review.setDecidedAt(Instant.now());
        review.setDecidedBy(currentUser);
        review.setFeedback(feedback);
        review.getPost().setStatus(PostStatus.CHANGES_REQUESTED);
        auditService.record(
                review.getPost().getId(),
                currentUser,
                "CHANGES_REQUESTED",
                "Round " + review.getRoundNumber() + " changes requested: " + feedback
        );
        return postService.getDetail(review.getPost().getId());
    }

    private ReviewRequest loadReview(UUID reviewId) {
        return reviewRepository.findDetailedById(reviewId)
                .orElseThrow(() -> new NotFoundException("Review request not found."));
    }

    private void assertActionable(ReviewRequest review) {
        if (review.getStatus() != ReviewStatus.PREPARED && review.getStatus() != ReviewStatus.SENT) {
            throw new BusinessException("This review request has already been decided.");
        }
        PostStatus postStatus = review.getPost().getStatus();
        if (postStatus != PostStatus.DRAFT && postStatus != PostStatus.IN_REVIEW) {
            throw new BusinessException("This post is no longer awaiting review.");
        }
    }

    private void markAsSentIfNeeded(ReviewRequest review, AppUser currentUser) {
        if (review.getStatus() == ReviewStatus.PREPARED) {
            review.setStatus(ReviewStatus.SENT);
            review.setSentAt(Instant.now());
            review.getPost().setStatus(PostStatus.IN_REVIEW);
            auditService.record(review.getPost().getId(), currentUser, "REVIEW_MARKED_SENT",
                    "Round " + review.getRoundNumber() + " marked as sent when opened for decision.");
        }
    }

    private void assertSuperAdmin(AppUser currentUser) {
        if (currentUser.getRole() != Role.SUPER_ADMIN) {
            throw new ForbiddenException("Only a Super Admin can review posts.");
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
