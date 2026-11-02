package com.specanciens.socialdesk.review;

import com.specanciens.socialdesk.post.PostDtos.PostDetailDto;
import com.specanciens.socialdesk.post.PostService;
import com.specanciens.socialdesk.review.ReviewDtos.ReviewDecisionRequest;
import com.specanciens.socialdesk.review.ReviewDtos.ReviewPageResponse;
import com.specanciens.socialdesk.user.AppUser;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/review-requests")
public class ReviewController {

    private final PostService postService;
    private final ReviewService reviewService;

    public ReviewController(PostService postService, ReviewService reviewService) {
        this.postService = postService;
        this.reviewService = reviewService;
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ReviewPageResponse get(@PathVariable UUID id, @AuthenticationPrincipal AppUser currentUser) {
        return reviewService.getReviewPage(id, currentUser);
    }

    @PostMapping("/{id}/mark-sent")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markSent(@PathVariable UUID id, @AuthenticationPrincipal AppUser currentUser) {
        postService.markReviewSent(id, currentUser);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public PostDetailDto approve(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewDecisionRequest request,
            @AuthenticationPrincipal AppUser currentUser
    ) {
        return reviewService.approve(id, request, currentUser);
    }

    @PostMapping("/{id}/request-changes")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public PostDetailDto requestChanges(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewDecisionRequest request,
            @AuthenticationPrincipal AppUser currentUser
    ) {
        return reviewService.requestChanges(id, request, currentUser);
    }
}
