package com.specanciens.socialdesk.excel;

import java.nio.file.Path;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminExcelController {

    private static final MediaType XLSX =
            MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final ExcelExportService exportService;
    private final ExcelBackupService backupService;

    public AdminExcelController(ExcelExportService exportService, ExcelBackupService backupService) {
        this.exportService = exportService;
        this.backupService = backupService;
    }

    @GetMapping("/exports/excel")
    public ResponseEntity<byte[]> downloadCurrentExcel() {
        String filename = exportService.currentFilename();
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
                .body(exportService.generateWorkbook());
    }

    @GetMapping("/backups")
    public BackupPageDto backups() {
        return new BackupPageDto(backupService.listSnapshots(), backupService.retentionDays());
    }

    @PostMapping("/backups/run")
    public BackupInfo createSnapshot() {
        return backupService.snapshotNow();
    }

    @GetMapping("/backups/{filename:.+}")
    public ResponseEntity<Resource> downloadSnapshot(@PathVariable String filename) {
        Path path = backupService.load(filename);
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(filename).build().toString())
                .body(new FileSystemResource(path));
    }
}
