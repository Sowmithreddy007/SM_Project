package com.specanciens.socialdesk.post;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PostRepository extends JpaRepository<Post, UUID> {

    @EntityGraph(attributePaths = {"assignee", "createdBy", "platforms"})
    @Query("""
            select distinct p from Post p
            left join p.assignee a
            where (:status is null or p.status = :status)
              and (:postType is null or p.postType = :postType)
              and (:assigneeId is null or a.id = :assigneeId)
              and (:fromDate is null or p.publishDate >= :fromDate)
              and (:toDate is null or p.publishDate <= :toDate)
              and (:search is null or lower(p.title) like lower(concat('%', :search, '%'))
                   or lower(p.caption) like lower(concat('%', :search, '%')))
            order by p.publishDate asc, p.createdAt desc
            """)
    List<Post> search(
            PostStatus status,
            PostType postType,
            UUID assigneeId,
            LocalDate fromDate,
            LocalDate toDate,
            String search
    );

    @EntityGraph(attributePaths = {"assignee", "createdBy", "platforms"})
    @Query("select p from Post p where p.id = :id")
    Optional<Post> findDetailedById(UUID id);

    @EntityGraph(attributePaths = {"assignee", "createdBy", "platforms"})
    @Query("select distinct p from Post p order by p.publishDate asc, p.createdAt asc")
    List<Post> findAllDetailed();

    long countByStatus(PostStatus status);

    @EntityGraph(attributePaths = {"assignee", "createdBy", "platforms"})
    List<Post> findTop5ByStatusOrderByPublishDateAsc(PostStatus status);

    @EntityGraph(attributePaths = {"assignee", "createdBy", "platforms"})
    List<Post> findTop5ByStatusAndPublishDateBeforeOrderByPublishDateAsc(PostStatus status, LocalDate date);
}
