package com.specanciens.socialdesk.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String baseUrl,
        String reviewerEmail,
        String backupDir,
        String timezone,
        int backupRetentionDays,
        BootstrapAdmin bootstrapAdmin
) {
    public record BootstrapAdmin(String email, String password, String name) {
    }
}
