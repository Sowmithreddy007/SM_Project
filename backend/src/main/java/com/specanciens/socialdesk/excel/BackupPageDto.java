package com.specanciens.socialdesk.excel;

import java.util.List;

public record BackupPageDto(
        List<BackupInfo> snapshots,
        int retentionDays
) {
}
