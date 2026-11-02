package com.specanciens.socialdesk.dashboard;

import com.specanciens.socialdesk.post.PostDtos.PostSummaryDto;
import java.time.LocalDate;
import java.util.List;

public record DashboardDto(
        long totalPosts,
        long drafts,
        long inReview,
        long changesRequested,
        long approved,
        long posted,
        long cancelled,
        LocalDate today,
        List<PostSummaryDto> reviewQueue,
        List<PostSummaryDto> upcomingApproved,
        List<PostSummaryDto> overdue
) {
}
