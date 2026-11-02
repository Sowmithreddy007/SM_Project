CREATE TABLE app_users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE posts (
    id UUID PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    post_type VARCHAR(30) NOT NULL,
    publish_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL,
    assignee_id UUID NOT NULL,
    drive_url VARCHAR(1000) NOT NULL,
    caption TEXT NOT NULL,
    notes VARCHAR(2000),
    posted_url VARCHAR(1000),
    posted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL,
    review_round INTEGER NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_posts_assignee FOREIGN KEY (assignee_id) REFERENCES app_users (id),
    CONSTRAINT fk_posts_creator FOREIGN KEY (created_by) REFERENCES app_users (id)
);

CREATE TABLE post_platforms (
    post_id UUID NOT NULL,
    platform VARCHAR(30) NOT NULL,
    PRIMARY KEY (post_id, platform),
    CONSTRAINT fk_post_platforms_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
);

CREATE TABLE review_requests (
    id UUID PRIMARY KEY,
    post_id UUID NOT NULL,
    round_number INTEGER NOT NULL,
    status VARCHAR(30) NOT NULL,
    requested_by UUID NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    email_subject VARCHAR(300) NOT NULL,
    email_body TEXT NOT NULL,
    prepared_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    decided_at TIMESTAMP WITH TIME ZONE,
    decided_by UUID,
    feedback TEXT,
    CONSTRAINT fk_reviews_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_requester FOREIGN KEY (requested_by) REFERENCES app_users (id),
    CONSTRAINT fk_reviews_decider FOREIGN KEY (decided_by) REFERENCES app_users (id)
);

CREATE TABLE audit_events (
    id UUID PRIMARY KEY,
    post_id UUID,
    actor_id UUID,
    action_type VARCHAR(60) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_audit_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES app_users (id)
);

CREATE INDEX idx_posts_status ON posts (status);
CREATE INDEX idx_posts_publish_date ON posts (publish_date);
CREATE INDEX idx_posts_assignee ON posts (assignee_id);
CREATE INDEX idx_review_requests_post ON review_requests (post_id);
CREATE INDEX idx_review_requests_status ON review_requests (status);
CREATE INDEX idx_audit_events_post ON audit_events (post_id);
