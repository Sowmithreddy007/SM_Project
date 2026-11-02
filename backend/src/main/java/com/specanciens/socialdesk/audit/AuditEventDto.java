package com.specanciens.socialdesk.audit;

import java.time.Instant;
import java.util.UUID;

public record AuditEventDto(
        UUID id,
        UUID postId,
        UUID actorId,
        String actionType,
        String details,
        Instant createdAt
) {
    public static AuditEventDto from(AuditEvent event) {
        return new AuditEventDto(
                event.getId(),
                event.getPostId(),
                event.getActorId(),
                event.getActionType(),
                event.getDetails(),
                event.getCreatedAt()
        );
    }
}
