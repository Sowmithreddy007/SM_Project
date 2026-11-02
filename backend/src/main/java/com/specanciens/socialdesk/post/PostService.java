package com.specanciens.socialdesk.post;

import com.specanciens.socialdesk.audit.AuditService;
import com.specanciens.socialdesk.common.BusinessException;
import com.specanciens.socialdesk.common.ForbiddenException;
import com.specanciens.socialdesk.common.NotFoundException;
import com.specanciens.socialdesk.config.AppProperties;
import com.specanciens.socialdesk.post.PostDtos.CancelRequest;
import com.specanciens.socialdesk.post.PostDtos.MarkPostedRequest;
import com.specanciens.socialdesk.post.PostDtos.PostDetailDto;
import com.specanciens.socialdesk.post.PostDtos.PostRequest;
import com.specanciens.socialdesk.post.PostDtos.PostSummaryDto;
import com.specanciens.socialdesk.post.PostDtos.ReopenRequest;
import com.specanciens.socialdesk.review.EmailDraft;
import com.specanciens.socialdesk.review.GmailComposer;
import com.specanciens.socialdesk.review.ReviewDtos.PrepareReviewResponse;
import com.specanciens.socialdesk.review.ReviewRequest;
import com.specanciens.socialdesk.review.ReviewRequestRepository;
import com.specanciens.socialdesk.review.ReviewStatus;
import com.specanciens.socialdesk.user.AppUser;
import com.specanciens.socialdesk.user.AppUserRepository;
import com.specanciens.socialdesk.user.Role;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PostService {

    private final PostRepository postRepository;
    private final AppUserRepository userRepository;
    private final ReviewRequestRepository reviewRepository;
    private final AuditService auditService;
    private final GmailComposer gmailComposer;
    private final AppProperties appProperties;

    public PostService(
            PostRepository postRepository,
            AppUserRepository userRepository,
            ReviewRequestRepository reviewRepository,
            AuditService auditService,
            GmailComposer gmailComposer,
            AppProperties appProperties
    ) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.reviewRepository = reviewRepository;
        this.auditService = auditService;
        this.gmailComposer = gmailComposer;
        this.appProperties = appProperties;
    }

    @Transactional(readOnly = true)
    public List<PostSummaryDto> list(
            PostStatus status,
            PostType postType,
            UUID assigneeId,
            LocalDate fromDate,
            LocalDate toDate,
            String search
    ) {
        String normalizedSearch = search == null || search.isBlank() ? null : search.trim();
        return postRepository.search(status, postType, assigneeId, fromDate, toDate, normalizedSearch)
                .stream().map(PostMapper::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public PostDetailDto getDetail(UUID id) {
        Post post = loadDetailed(id);
        return PostMapper.toDetail(
                post,
                reviewRepository.findByPostIdOrderByRoundNumberDesc(id).stream()
                        .map(com.specanciens.socialdesk.review.ReviewDtos.ReviewDto::from).toList(),
                auditService.forPost(id)
        );
    }

    @Transactional
    public PostDetailDto create(PostRequest request, AppUser currentUser) {
        AppUser assignee = loadActiveAssignee(request.assigneeId());
        Post post = new Post(
                request.title(),
                request.postType(),
                request.publishDate(),
                assignee,
                request.driveUrl(),
                request.caption(),
                blankToNull(request.notes()),
                request.platforms(),
                currentUser
        );
        postRepository.save(post);
        auditService.record(post.getId(), currentUser, "POST_CREATED",
                "Created draft for " + post.getTitle() + ".");
        return getDetail(post.getId());
    }

    @Transactional
    public PostDetailDto update(UUID id, PostRequest request, AppUser currentUser) {
        Post post = loadDetailed(id);
        assertCanEdit(post, currentUser);
        if (post.getStatus() != PostStatus.DRAFT && post.getStatus() != PostStatus.CHANGES_REQUESTED) {
            throw new BusinessException("This post can no longer be edited because it is " + statusLabel(post.getStatus()) + ".");
        }

        supersedePreparedReview(post.getId());
        AppUser assignee = loadActiveAssignee(request.assigneeId());
        post.setTitle(request.title());
        post.setPostType(request.postType());
        post.setPlatforms(request.platforms());
        post.setPublishDate(request.publishDate());
        post.setAssignee(assignee);
        post.setDriveUrl(request.driveUrl());
        post.setCaption(request.caption());
        post.setNotes(blankToNull(request.notes()));

        auditService.record(post.getId(), currentUser, "POST_UPDATED", "Post details updated.");
        return getDetail(id);
    }

    @Transactional
    public PrepareReviewResponse prepareReview(UUID postId, AppUser currentUser) {
        Post post = loadDetailed(postId);
        assertCanEdit(post, currentUser);
        if (post.getStatus() != PostStatus.DRAFT && post.getStatus() != PostStatus.CHANGES_REQUESTED) {
            throw new BusinessException("A review request can only be prepared for a draft or a post with changes requested.");
        }

        ReviewRequest existing = reviewRepository
                .findFirstByPostIdAndStatusOrderByPreparedAtDesc(postId, ReviewStatus.PREPARED)
                .orElse(null);
        if (existing != null) {
            return toPrepareResponse(existing);
        }

        String recipientEmail = appProperties.reviewerEmail();
        AppUser reviewer = null;
        if (recipientEmail != null && !recipientEmail.isBlank()) {
            reviewer = userRepository.findByEmailIgnoreCase(recipientEmail).orElse(null);
        } else {
            reviewer = userRepository.findFirstByRoleAndActiveTrueOrderByFullNameAsc(Role.SUPER_ADMIN)
                    .orElseThrow(() -> new BusinessException("No active Super Admin is available to review this post."));
            recipientEmail = reviewer.getEmail();
        }
        if (recipientEmail == null || recipientEmail.isBlank()) {
            throw new BusinessException("Set a reviewer email before preparing a review request.");
        }

        int nextRound = post.getReviewRound() + 1;
        UUID reviewId = UUID.randomUUID();
        EmailDraft draft = gmailComposer.compose(
                reviewId,
                post,
                currentUser,
                recipientEmail,
                reviewer == null ? null : reviewer.getFullName()
        );

        ReviewRequest review = new ReviewRequest(
                reviewId,
                post,
                nextRound,
                currentUser,
                recipientEmail,
                draft.subject(),
                draft.body()
        );
        reviewRepository.save(review);
        post.setReviewRound(nextRound);
        auditService.record(post.getId(), currentUser, "REVIEW_PREPARED",
                "Round " + nextRound + " review email prepared for " + recipientEmail + ".");
        return new PrepareReviewResponse(
                review.getId(),
                draft.recipientEmail(),
                draft.subject(),
                draft.body(),
                draft.reviewUrl(),
                draft.gmailComposeUrl(),
                review.getPreparedAt()
        );
    }

    @Transactional
    public void markReviewSent(UUID reviewId, AppUser currentUser) {
        ReviewRequest review = reviewRepository.findDetailedById(reviewId)
                .orElseThrow(() -> new NotFoundException("Review request not found."));
        if (!isSuperAdmin(currentUser) && !review.getRequestedBy().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("Only the person who prepared this review can mark it as sent.");
        }
        if (review.getStatus() == ReviewStatus.APPROVED
                || review.getStatus() == ReviewStatus.CHANGES_REQUESTED
                || review.getStatus() == ReviewStatus.SUPERSEDED) {
            throw new BusinessException("This review request is already closed.");
        }
        if (review.getStatus() == ReviewStatus.PREPARED) {
            review.setStatus(ReviewStatus.SENT);
            review.setSentAt(Instant.now());
            review.getPost().setStatus(PostStatus.IN_REVIEW);
            auditService.record(review.getPost().getId(), currentUser, "REVIEW_MARKED_SENT",
                    "Round " + review.getRoundNumber() + " marked as emailed.");
        }
    }

    @Transactional
    public PostDetailDto markPosted(UUID postId, MarkPostedRequest request, AppUser currentUser) {
        Post post = loadDetailed(postId);
        if (!isSuperAdmin(currentUser) && !post.getAssignee().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("Only the assignee or a Super Admin can mark this post as posted.");
        }
        if (post.getStatus() != PostStatus.APPROVED) {
            throw new BusinessException("Only an approved post can be marked as posted.");
        }

        String postedUrl = blankToNull(request.postedUrl());
        if ((post.getPostType() == PostType.POST || post.getPostType() == PostType.REEL) && postedUrl == null) {
            throw new BusinessException("A live post URL is required for posts and reels.");
        }

        post.setPostedUrl(postedUrl);
        post.setPostedAt(Instant.now());
        post.setStatus(PostStatus.POSTED);
        auditService.record(post.getId(), currentUser, "POST_MARKED_POSTED",
                postedUrl == null ? "Marked as posted." : "Marked as posted: " + postedUrl);
        return getDetail(postId);
    }

    @Transactional
    public PostDetailDto reopen(UUID postId, ReopenRequest request, AppUser currentUser) {
        assertSuperAdmin(currentUser);
        Post post = loadDetailed(postId);
        if (post.getStatus() != PostStatus.APPROVED) {
            throw new BusinessException("Only an approved post can be reopened.");
        }
        post.setStatus(PostStatus.CHANGES_REQUESTED);
        supersedePreparedReview(post.getId());
        auditService.record(post.getId(), currentUser, "POST_REOPENED", request.reason());
        return getDetail(postId);
    }

    @Transactional
    public PostDetailDto cancel(UUID postId, CancelRequest request, AppUser currentUser) {
        Post post = loadDetailed(postId);
        assertCanEdit(post, currentUser);
        if (post.getStatus() == PostStatus.POSTED || post.getStatus() == PostStatus.CANCELLED) {
            throw new BusinessException("Posted or already cancelled content cannot be cancelled.");
        }
        post.setStatus(PostStatus.CANCELLED);
        supersedePreparedReview(post.getId());
        auditService.record(post.getId(), currentUser, "POST_CANCELLED",
                blankToNull(request.reason()) == null ? "Post cancelled." : request.reason());
        return getDetail(postId);
    }

    private Post loadDetailed(UUID id) {
        return postRepository.findDetailedById(id)
                .orElseThrow(() -> new NotFoundException("Post not found."));
    }

    private AppUser loadActiveAssignee(UUID id) {
        AppUser assignee = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Assignee not found."));
        if (!assignee.isActive()) {
            throw new BusinessException("The selected assignee is inactive.");
        }
        return assignee;
    }

    private void supersedePreparedReview(UUID postId) {
        reviewRepository.findFirstByPostIdAndStatusOrderByPreparedAtDesc(postId, ReviewStatus.PREPARED)
                .ifPresent(review -> review.setStatus(ReviewStatus.SUPERSEDED));
    }

    private void assertCanEdit(Post post, AppUser currentUser) {
        if (!isSuperAdmin(currentUser)
                && !post.getAssignee().getId().equals(currentUser.getId())
                && !post.getCreatedBy().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("Only the assignee, creator, or a Super Admin can edit this post.");
        }
    }

    private void assertSuperAdmin(AppUser currentUser) {
        if (!isSuperAdmin(currentUser)) {
            throw new ForbiddenException("Only a Super Admin can perform this action.");
        }
    }

    private boolean isSuperAdmin(AppUser user) {
        return user.getRole() == Role.SUPER_ADMIN;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String statusLabel(PostStatus status) {
        return status.name().toLowerCase().replace('_', ' ');
    }

    private PrepareReviewResponse toPrepareResponse(ReviewRequest review) {
        String baseUrl = appProperties.baseUrl() == null
                ? "http://localhost:5173"
                : appProperties.baseUrl().replaceAll("/+$", "");
        String reviewUrl = baseUrl + "/review/" + review.getId();
        return new PrepareReviewResponse(
                review.getId(),
                review.getRecipientEmail(),
                review.getEmailSubject(),
                review.getEmailBody(),
                reviewUrl,
                gmailComposer.gmailUrl(review.getRecipientEmail(), review.getEmailSubject(), review.getEmailBody()),
                review.getPreparedAt()
        );
    }
}
