package com.specanciens.socialdesk.post;

import com.specanciens.socialdesk.audit.AuditEventDto;
import com.specanciens.socialdesk.post.PostDtos.PostDetailDto;
import com.specanciens.socialdesk.post.PostDtos.PostSummaryDto;
import com.specanciens.socialdesk.review.ReviewDtos.ReviewDto;
import com.specanciens.socialdesk.user.UserDtos.UserOptionDto;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public final class PostMapper {

    private PostMapper() {
    }

    public static PostSummaryDto toSummary(Post post) {
        return new PostSummaryDto(
                post.getId(),
                post.getTitle(),
                post.getPostType(),
                copyPlatforms(post.getPlatforms()),
                post.getPublishDate(),
                post.getStatus(),
                UserOptionDto.from(post.getAssignee()),
                post.getDriveUrl(),
                preview(post.getCaption()),
                post.getPostedUrl(),
                post.getReviewRound(),
                post.getUpdatedAt()
        );
    }

    public static PostDetailDto toDetail(Post post, List<ReviewDto> reviews, List<AuditEventDto> audit) {
        return new PostDetailDto(
                post.getId(),
                post.getTitle(),
                post.getPostType(),
                copyPlatforms(post.getPlatforms()),
                post.getPublishDate(),
                post.getStatus(),
                UserOptionDto.from(post.getAssignee()),
                UserOptionDto.from(post.getCreatedBy()),
                post.getDriveUrl(),
                post.getCaption(),
                post.getNotes(),
                post.getPostedUrl(),
                post.getPostedAt(),
                post.getReviewRound(),
                post.getCreatedAt(),
                post.getUpdatedAt(),
                reviews,
                audit
        );
    }

    public static Set<Platform> copyPlatforms(Set<Platform> platforms) {
        return new LinkedHashSet<>(platforms);
    }

    private static String preview(String caption) {
        if (caption == null) {
            return "";
        }
        String oneLine = caption.replaceAll("\\s+", " ").trim();
        return oneLine.length() <= 160 ? oneLine : oneLine.substring(0, 157) + "...";
    }
}
