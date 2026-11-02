package com.specanciens.socialdesk.audit;

import com.specanciens.socialdesk.user.AppUser;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

    private final AuditEventRepository repository;

    public AuditService(AuditEventRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void record(UUID postId, AppUser actor, String action, String details) {
        repository.save(new AuditEvent(postId, actor == null ? null : actor.getId(), action, details));
    }

    @Transactional(readOnly = true)
    public List<AuditEventDto> forPost(UUID postId) {
        return repository.findByPostIdOrderByCreatedAtDesc(postId).stream().map(AuditEventDto::from).toList();
    }
}
