package com.specanciens.socialdesk.excel;

import java.time.Instant;

public record BackupInfo(
        String filename,
        long sizeBytes,
        Instant modifiedAt
) {
}
