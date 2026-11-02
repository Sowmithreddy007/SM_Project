package com.specanciens.socialdesk.review;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ReviewRequestRepository extends JpaRepository<ReviewRequest, UUID> {

    @EntityGraph(attributePaths = {
            "post", "post.assignee", "post.createdBy", "post.platforms",
            "requestedBy", "decidedBy"
    })
    @Query("select r from ReviewRequest r where r.id = :id")
    Optional<ReviewRequest> findDetailedById(UUID id);

    @EntityGraph(attributePaths = {"requestedBy", "decidedBy"})
    List<ReviewRequest> findByPostIdOrderByRoundNumberDesc(UUID postId);

    @EntityGraph(attributePaths = {"requestedBy", "decidedBy"})
    Optional<ReviewRequest> findFirstByPostIdAndStatusOrderByPreparedAtDesc(UUID postId, ReviewStatus status);

    @EntityGraph(attributePaths = {
            "post", "post.assignee", "post.createdBy", "post.platforms",
            "requestedBy", "decidedBy"
    })
    @Query("""
            select r from ReviewRequest r
            join fetch r.post p
            order by p.publishDate asc, p.createdAt asc, r.roundNumber asc
            """)
    List<ReviewRequest> findAllDetailed();
}
