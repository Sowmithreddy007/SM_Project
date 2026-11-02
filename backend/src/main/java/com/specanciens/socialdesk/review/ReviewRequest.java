package com.specanciens.socialdesk.review;

import com.specanciens.socialdesk.post.Post;
import com.specanciens.socialdesk.user.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "review_requests")
public class ReviewRequest {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @Column(name = "round_number", nullable = false)
    private int roundNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReviewStatus status = ReviewStatus.PREPARED;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requested_by", nullable = false)
    private AppUser requestedBy;

    @Column(name = "recipient_email", nullable = false, length = 255)
    private String recipientEmail;

    @Column(name = "email_subject", nullable = false, length = 300)
    private String emailSubject;

    @Column(name = "email_body", nullable = false, columnDefinition = "TEXT")
    private String emailBody;

    @Column(name = "prepared_at", nullable = false)
    private Instant preparedAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decided_by")
    private AppUser decidedBy;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    protected ReviewRequest() {
    }

    public ReviewRequest(UUID id, Post post, int roundNumber, AppUser requestedBy, String recipientEmail,
                         String emailSubject, String emailBody) {
        this.id = id;
        this.post = post;
        this.roundNumber = roundNumber;
        this.requestedBy = requestedBy;
        this.recipientEmail = recipientEmail;
        this.emailSubject = emailSubject;
        this.emailBody = emailBody;
        this.preparedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public Post getPost() {
        return post;
    }

    public int getRoundNumber() {
        return roundNumber;
    }

    public ReviewStatus getStatus() {
        return status;
    }

    public void setStatus(ReviewStatus status) {
        this.status = status;
    }

    public AppUser getRequestedBy() {
        return requestedBy;
    }

    public String getRecipientEmail() {
        return recipientEmail;
    }

    public String getEmailSubject() {
        return emailSubject;
    }

    public String getEmailBody() {
        return emailBody;
    }

    public Instant getPreparedAt() {
        return preparedAt;
    }

    public Instant getSentAt() {
        return sentAt;
    }

    public void setSentAt(Instant sentAt) {
        this.sentAt = sentAt;
    }

    public Instant getDecidedAt() {
        return decidedAt;
    }

    public void setDecidedAt(Instant decidedAt) {
        this.decidedAt = decidedAt;
    }

    public AppUser getDecidedBy() {
        return decidedBy;
    }

    public void setDecidedBy(AppUser decidedBy) {
        this.decidedBy = decidedBy;
    }

    public String getFeedback() {
        return feedback;
    }

    public void setFeedback(String feedback) {
        this.feedback = feedback;
    }
}
