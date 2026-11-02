package com.specanciens.socialdesk.dashboard;

import com.specanciens.socialdesk.config.AppProperties;
import com.specanciens.socialdesk.post.PostDtos.PostSummaryDto;
import com.specanciens.socialdesk.post.PostRepository;
import com.specanciens.socialdesk.post.PostService;
import com.specanciens.socialdesk.post.PostStatus;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {

    private final PostRepository postRepository;
    private final PostService postService;
    private final AppProperties appProperties;

    public DashboardService(PostRepository postRepository, PostService postService, AppProperties appProperties) {
        this.postRepository = postRepository;
        this.postService = postService;
        this.appProperties = appProperties;
    }

    @Transactional(readOnly = true)
    public DashboardDto dashboard() {
        LocalDate today = LocalDate.now(ZoneId.of(appProperties.timezone()));
        List<PostSummaryDto> all = postService.list(null, null, null, null, null, null);

        List<PostSummaryDto> reviewQueue = all.stream()
                .filter(post -> post.status() == PostStatus.IN_REVIEW)
                .sorted(Comparator.comparing(PostSummaryDto::publishDate))
                .limit(5)
                .toList();

        List<PostSummaryDto> upcoming = all.stream()
                .filter(post -> post.status() == PostStatus.APPROVED && !post.publishDate().isBefore(today))
                .sorted(Comparator.comparing(PostSummaryDto::publishDate))
                .limit(5)
                .toList();

        List<PostSummaryDto> overdue = all.stream()
                .filter(post -> (post.status() == PostStatus.IN_REVIEW || post.status() == PostStatus.APPROVED)
                        && post.publishDate().isBefore(today))
                .sorted(Comparator.comparing(PostSummaryDto::publishDate))
                .limit(5)
                .toList();

        return new DashboardDto(
                all.size(),
                postRepository.countByStatus(PostStatus.DRAFT),
                postRepository.countByStatus(PostStatus.IN_REVIEW),
                postRepository.countByStatus(PostStatus.CHANGES_REQUESTED),
                postRepository.countByStatus(PostStatus.APPROVED),
                postRepository.countByStatus(PostStatus.POSTED),
                postRepository.countByStatus(PostStatus.CANCELLED),
                today,
                reviewQueue,
                upcoming,
                overdue
        );
    }
}
