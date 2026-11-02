package com.specanciens.socialdesk.excel;

import com.specanciens.socialdesk.common.NotFoundException;
import com.specanciens.socialdesk.config.AppProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class ExcelBackupService {

    private static final Logger log = LoggerFactory.getLogger(ExcelBackupService.class);

    private final ExcelExportService exportService;
    private final Path excelDirectory;
    private final int retentionDays;

    public ExcelBackupService(ExcelExportService exportService, AppProperties appProperties) {
        this.exportService = exportService;
        this.retentionDays = Math.max(1, appProperties.backupRetentionDays());
        this.excelDirectory = Path.of(appProperties.backupDir()).resolve("excel").toAbsolutePath().normalize();
        try {
            Files.createDirectories(excelDirectory);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not create Excel backup directory " + excelDirectory, ex);
        }
    }

    @Scheduled(cron = "0 0 2 * * *", zone = "${app.timezone:Asia/Kolkata}")
    public void nightlySnapshot() {
        try {
            BackupInfo info = snapshotNow();
            log.info("Created nightly Excel snapshot {}", info.filename());
        } catch (RuntimeException ex) {
            log.error("Nightly Excel snapshot failed", ex);
        }
    }

    public BackupInfo snapshotNow() {
        byte[] workbook = exportService.generateWorkbook();
        String filename = exportService.currentFilename();
        Path target = excelDirectory.resolve(filename);
        Path temp = excelDirectory.resolve(filename + ".tmp");
        try {
            Files.write(temp, workbook);
            Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING);
            prune();
            return toInfo(target);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not write Excel snapshot.", ex);
        }
    }

    public List<BackupInfo> listSnapshots() {
        try (Stream<Path> files = Files.list(excelDirectory)) {
            return files
                    .filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().endsWith(".xlsx"))
                    .map(this::toInfo)
                    .sorted(Comparator.comparing(BackupInfo::modifiedAt).reversed())
                    .toList();
        } catch (IOException ex) {
            throw new IllegalStateException("Could not list Excel snapshots.", ex);
        }
    }

    public Path load(String filename) {
        String safeName = filename == null ? "" : filename.trim();
        if (!safeName.matches("[A-Za-z0-9_.-]+\\.xlsx")) {
            throw new NotFoundException("Backup not found.");
        }
        Path path = excelDirectory.resolve(safeName).normalize();
        if (!path.startsWith(excelDirectory) || !Files.isRegularFile(path)) {
            throw new NotFoundException("Backup not found.");
        }
        return path;
    }

    public int retentionDays() {
        return retentionDays;
    }

    private void prune() {
        Instant cutoff = Instant.now().minus(retentionDays, ChronoUnit.DAYS);
        try (Stream<Path> files = Files.list(excelDirectory)) {
            files.filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().endsWith(".xlsx"))
                    .filter(path -> {
                        try {
                            return Files.getLastModifiedTime(path).toInstant().isBefore(cutoff);
                        } catch (IOException ex) {
                            return false;
                        }
                    })
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException ex) {
                            log.warn("Could not delete old Excel snapshot {}", path, ex);
                        }
                    });
        } catch (IOException ex) {
            log.warn("Could not prune Excel snapshots", ex);
        }
    }

    private BackupInfo toInfo(Path path) {
        try {
            return new BackupInfo(
                    path.getFileName().toString(),
                    Files.size(path),
                    Files.getLastModifiedTime(path).toInstant()
            );
        } catch (IOException ex) {
            throw new IllegalStateException("Could not inspect Excel snapshot.", ex);
        }
    }
}
