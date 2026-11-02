package com.specanciens.socialdesk.post;

import com.specanciens.socialdesk.post.PostDtos.CancelRequest;
import com.specanciens.socialdesk.post.PostDtos.MarkPostedRequest;
import com.specanciens.socialdesk.post.PostDtos.PostDetailDto;
import com.specanciens.socialdesk.post.PostDtos.PostRequest;
import com.specanciens.socialdesk.post.PostDtos.PostSummaryDto;
import com.specanciens.socialdesk.post.PostDtos.ReopenRequest;
import com.specanciens.socialdesk.review.ReviewDtos.PrepareReviewResponse;
import com.specanciens.socialdesk.user.AppUser;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @GetMapping
    public List<PostSummaryDto> list(
            @RequestParam(required = false) PostStatus status,
            @RequestParam(required = false) PostType postType,
            @RequestParam(required = false) UUID assigneeId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) String search
    ) {
        return postService.list(status, postType, assigneeId, fromDate, toDate, search);
    }

    @GetMapping("/{id}")
    public PostDetailDto get(@PathVariable UUID id) {
        return postService.getDetail(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PostDetailDto create(
            @Valid @RequestBody PostRequest request,
            @AuthenticationPrincipal AppUser currentUser
    ) {
        return postService.create(request, currentUser);
    }

    @PutMapping("/{id}")
    public PostDetailDto update(
            @PathVariable UUID id,
            @Valid @RequestBody PostRequest request,
            @AuthenticationPrincipal AppUser currentUser
    ) {
        return postService.update(id, request, currentUser);
    }

    @PostMapping("/{id}/review-requests")
    public PrepareReviewResponse prepareReview(
            @PathVariable UUID id,
            @AuthenticationPrincipal AppUser currentUser
    ) {
        return postService.prepareReview(id, currentUser);
    }

    @PostMapping("/{id}/mark-posted")
    public PostDetailDto markPosted(
            @PathVariable UUID id,
            @Valid @RequestBody MarkPostedRequest request,
            @AuthenticationPrincipal AppUser currentUser
    ) {
        return postService.markPosted(id, request, currentUser);
    }

    @PostMapping("/{id}/reopen")
    public PostDetailDto reopen(
            @PathVariable UUID id,
            @Valid @RequestBody ReopenRequest request,
            @AuthenticationPrincipal AppUser currentUser
    ) {
        return postService.reopen(id, request, currentUser);
    }

    @PostMapping("/{id}/cancel")
    public PostDetailDto cancel(
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) CancelRequest request,
            @AuthenticationPrincipal AppUser currentUser
    ) {
        return postService.cancel(id, request == null ? new CancelRequest(null) : request, currentUser);
    }
}
