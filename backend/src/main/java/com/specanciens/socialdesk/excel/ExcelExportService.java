package com.specanciens.socialdesk.excel;

import com.specanciens.socialdesk.config.AppProperties;
import com.specanciens.socialdesk.post.Platform;
import com.specanciens.socialdesk.post.Post;
import com.specanciens.socialdesk.post.PostRepository;
import com.specanciens.socialdesk.post.PostStatus;
import com.specanciens.socialdesk.post.PostType;
import com.specanciens.socialdesk.review.ReviewRequest;
import com.specanciens.socialdesk.review.ReviewRequestRepository;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CreationHelper;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.common.usermodel.HyperlinkType;
import org.apache.poi.ss.usermodel.Hyperlink;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExcelExportService {

    private static final DateTimeFormatter FILE_DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd", Locale.ENGLISH);
    private static final DateTimeFormatter GENERATED_AT = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a", Locale.ENGLISH);
    private static final String[] TRACKER_HEADERS = {
            "ID", "Date", "Post Name", "Type", "Platforms", "Assigned To", "Drive Link",
            "Captions", "Status", "Latest Feedback", "Reviewer", "Review Date",
            "Posted", "Posted URL", "Last Updated"
    };
    private static final String[] REVIEW_HEADERS = {
            "Post", "Round", "Status", "Requested By", "Recipient", "Prepared At",
            "Sent At", "Decided By", "Decided At", "Feedback"
    };

    private final PostRepository postRepository;
    private final ReviewRequestRepository reviewRepository;
    private final AppProperties appProperties;

    public ExcelExportService(
            PostRepository postRepository,
            ReviewRequestRepository reviewRepository,
            AppProperties appProperties
    ) {
        this.postRepository = postRepository;
        this.reviewRepository = reviewRepository;
        this.appProperties = appProperties;
    }

    @Transactional(readOnly = true)
    public byte[] generateWorkbook() {
        ZoneId zone = ZoneId.of(appProperties.timezone());
        List<Post> posts = postRepository.findAllDetailed();
        List<ReviewRequest> reviews = reviewRepository.findAllDetailed();
        Map<UUID, ReviewRequest> latestReviews = latestReviews(reviews);

        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Styles styles = new Styles(workbook, zone);
            writeTrackerSheet(workbook, styles, posts, latestReviews, zone);
            writeReviewSheet(workbook, styles, reviews, zone);
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Could not generate the Excel workbook.", ex);
        }
    }

    public String currentFilename() {
        return "SPECANCIENS_Content_Tracker_" + FILE_DATE.format(LocalDate.now(ZoneId.of(appProperties.timezone()))) + ".xlsx";
    }

    private Map<UUID, ReviewRequest> latestReviews(List<ReviewRequest> reviews) {
        Map<UUID, ReviewRequest> latest = new HashMap<>();
        for (ReviewRequest review : reviews) {
            latest.merge(
                    review.getPost().getId(),
                    review,
                    (left, right) -> left.getRoundNumber() >= right.getRoundNumber() ? left : right
            );
        }
        return latest;
    }

    private void writeTrackerSheet(
            XSSFWorkbook workbook,
            Styles styles,
            List<Post> posts,
            Map<UUID, ReviewRequest> latestReviews,
            ZoneId zone
    ) {
        Sheet sheet = workbook.createSheet("Tracker");
        writeTitle(sheet, styles, "SPECANCIENS Content Tracker", TRACKER_HEADERS.length, zone);
        writeHeader(sheet, styles, 3, TRACKER_HEADERS);
        styles.setColumnWidths(sheet, new int[]{38, 13, 36, 10, 22, 18, 45, 60, 18, 45, 18, 17, 10, 45, 18});
        sheet.createFreezePane(2, 4);

        int rowIndex = 4;
        for (Post post : posts) {
            Row row = sheet.createRow(rowIndex++);
            row.setHeightInPoints(58);
            ReviewRequest latest = latestReviews.get(post.getId());

            writeString(row, 0, post.getId().toString(), styles.idStyle);
            writeDate(row, 1, post.getPublishDate(), styles.dateStyle, zone);
            writeString(row, 2, post.getTitle(), styles.wrapStyle);
            writeString(row, 3, displayType(post.getPostType()), styles.centeredStyle);
            writeString(row, 4, post.getPlatforms().stream()
                    .sorted(Comparator.comparingInt(Platform::ordinal))
                    .map(this::displayPlatform)
                    .collect(Collectors.joining(", ")), styles.wrapStyle);
            writeString(row, 5, post.getAssignee().getFullName(), styles.assigneeStyle(post.getAssignee().getId()));
            writeHyperlink(row, 6, post.getDriveUrl(), styles.hyperlinkStyle, workbook);
            writeString(row, 7, post.getCaption(), styles.wrapStyle);
            writeString(row, 8, displayStatus(post.getStatus()), styles.statusStyle(post.getStatus()));
            writeString(row, 9, latest == null ? null : latest.getFeedback(), styles.wrapStyle);
            writeString(row, 10, reviewerName(latest), styles.wrapStyle);
            if (latest == null) {
                writeBlank(row, 11, styles.dateTimeStyle);
            } else {
                writeDateTime(row, 11, reviewDate(latest), styles.dateTimeStyle, zone);
            }
            writeString(row, 12, post.getStatus() == PostStatus.POSTED ? "Y" : "N", styles.centeredStyle);
            writeHyperlink(row, 13, post.getPostedUrl(), styles.hyperlinkStyle, workbook);
            writeDateTime(row, 14, post.getUpdatedAt(), styles.dateTimeStyle, zone);
        }

        if (!posts.isEmpty()) {
            sheet.setAutoFilter(new CellRangeAddress(3, rowIndex - 1, 0, TRACKER_HEADERS.length - 1));
        }
    }

    private void writeReviewSheet(XSSFWorkbook workbook, Styles styles, List<ReviewRequest> reviews, ZoneId zone) {
        Sheet sheet = workbook.createSheet("Review History");
        writeTitle(sheet, styles, "SPECANCIENS Review History", REVIEW_HEADERS.length, zone);
        writeHeader(sheet, styles, 3, REVIEW_HEADERS);
        styles.setColumnWidths(sheet, new int[]{36, 8, 20, 18, 30, 18, 18, 18, 18, 55});
        sheet.createFreezePane(1, 4);

        int rowIndex = 4;
        for (ReviewRequest review : reviews) {
            Row row = sheet.createRow(rowIndex++);
            row.setHeightInPoints(46);
            writeString(row, 0, review.getPost().getTitle(), styles.wrapStyle);
            writeString(row, 1, String.valueOf(review.getRoundNumber()), styles.centeredStyle);
            writeString(row, 2, displayReviewStatus(review), styles.wrapStyle);
            writeString(row, 3, review.getRequestedBy().getFullName(), styles.wrapStyle);
            writeString(row, 4, review.getRecipientEmail(), styles.wrapStyle);
            writeDateTime(row, 5, review.getPreparedAt(), styles.dateTimeStyle, zone);
            writeDateTime(row, 6, review.getSentAt(), styles.dateTimeStyle, zone);
            writeString(row, 7, review.getDecidedBy() == null ? null : review.getDecidedBy().getFullName(), styles.wrapStyle);
            writeDateTime(row, 8, review.getDecidedAt(), styles.dateTimeStyle, zone);
            writeString(row, 9, review.getFeedback(), styles.wrapStyle);
        }

        if (!reviews.isEmpty()) {
            sheet.setAutoFilter(new CellRangeAddress(3, rowIndex - 1, 0, REVIEW_HEADERS.length - 1));
        }
    }

    private void writeTitle(Sheet sheet, Styles styles, String title, int columns, ZoneId zone) {
        Row titleRow = sheet.createRow(0);
        titleRow.setHeightInPoints(28);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue(title);
        titleCell.setCellStyle(styles.titleStyle);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, columns - 1));

        Row generatedRow = sheet.createRow(1);
        Cell generatedCell = generatedRow.createCell(0);
        generatedCell.setCellValue("Generated by SPECANCIENS Social Desk · "
                + GENERATED_AT.format(java.time.ZonedDateTime.now(zone)));
        generatedCell.setCellStyle(styles.generatedStyle);
        sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, columns - 1));
    }

    private void writeHeader(Sheet sheet, Styles styles, int rowIndex, String[] headers) {
        Row header = sheet.createRow(rowIndex);
        header.setHeightInPoints(30);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = header.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(styles.headerStyle);
        }
    }

    private void writeString(Row row, int column, String value, CellStyle style) {
        Cell cell = row.createCell(column);
        if (value != null) {
            cell.setCellValue(value);
        }
        cell.setCellStyle(style);
    }

    private void writeBlank(Row row, int column, CellStyle style) {
        row.createCell(column).setCellStyle(style);
    }

    private void writeDate(Row row, int column, LocalDate value, CellStyle style, ZoneId zone) {
        Cell cell = row.createCell(column);
        cell.setCellValue(Date.from(value.atStartOfDay(zone).toInstant()));
        cell.setCellStyle(style);
    }

    private void writeDateTime(Row row, int column, Instant value, CellStyle style, ZoneId zone) {
        Cell cell = row.createCell(column);
        if (value != null) {
            cell.setCellValue(Date.from(value));
        }
        cell.setCellStyle(style);
    }

    private void writeHyperlink(Row row, int column, String url, CellStyle style, XSSFWorkbook workbook) {
        Cell cell = row.createCell(column);
        if (url != null && !url.isBlank()) {
            cell.setCellValue(url);
            Hyperlink hyperlink = workbook.getCreationHelper().createHyperlink(HyperlinkType.URL);
            hyperlink.setAddress(url);
            cell.setHyperlink(hyperlink);
        }
        cell.setCellStyle(style);
    }

    private String reviewerName(ReviewRequest review) {
        if (review == null) {
            return null;
        }
        if (review.getDecidedBy() != null) {
            return review.getDecidedBy().getFullName();
        }
        return review.getRecipientEmail();
    }

    private Instant reviewDate(ReviewRequest review) {
        if (review.getDecidedAt() != null) {
            return review.getDecidedAt();
        }
        if (review.getSentAt() != null) {
            return review.getSentAt();
        }
        return review.getPreparedAt();
    }

    private String displayType(PostType type) {
        return switch (type) {
            case POST -> "Post";
            case REEL -> "Reel";
            case STORY -> "Story";
            case OTHER -> "Other";
        };
    }

    private String displayPlatform(Platform platform) {
        return switch (platform) {
            case INSTAGRAM -> "Instagram";
            case FACEBOOK -> "Facebook";
            case LINKEDIN -> "LinkedIn";
        };
    }

    private String displayStatus(PostStatus status) {
        return switch (status) {
            case DRAFT -> "Draft";
            case IN_REVIEW -> "In Review";
            case CHANGES_REQUESTED -> "Changes Requested";
            case APPROVED -> "Approved";
            case POSTED -> "Posted";
            case CANCELLED -> "Cancelled";
        };
    }

    private String displayReviewStatus(ReviewRequest review) {
        if (review.getStatus() == null) {
            return "";
        }
        return switch (review.getStatus()) {
            case PREPARED -> "Prepared";
            case SENT -> "Sent";
            case APPROVED -> "Approved";
            case CHANGES_REQUESTED -> "Changes Requested";
            case SUPERSEDED -> "Superseded";
        };
    }

    private final class Styles {
        private final XSSFWorkbook workbook;
        private final CellStyle titleStyle;
        private final CellStyle generatedStyle;
        private final CellStyle headerStyle;
        private final CellStyle wrapStyle;
        private final CellStyle centeredStyle;
        private final CellStyle idStyle;
        private final CellStyle dateStyle;
        private final CellStyle dateTimeStyle;
        private final CellStyle hyperlinkStyle;
        private final Map<PostStatus, CellStyle> statusStyles = new LinkedHashMap<>();
        private final Map<UUID, CellStyle> assigneeStyles = new HashMap<>();
        private final IndexedColors[] assigneePalette = {
                IndexedColors.LIGHT_CORNFLOWER_BLUE,
                IndexedColors.LIGHT_GREEN,
                IndexedColors.LIGHT_YELLOW,
                IndexedColors.LIGHT_ORANGE,
                IndexedColors.LIGHT_TURQUOISE,
                IndexedColors.LAVENDER,
                IndexedColors.ROSE,
                IndexedColors.GREY_25_PERCENT
        };

        private Styles(XSSFWorkbook workbook, ZoneId zone) {
            this.workbook = workbook;
            CreationHelper helper = workbook.getCreationHelper();

            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 16);
            titleFont.setColor(IndexedColors.DARK_BLUE.getIndex());
            titleStyle = workbook.createCellStyle();
            titleStyle.setFont(titleFont);
            titleStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            Font generatedFont = workbook.createFont();
            generatedFont.setItalic(true);
            generatedFont.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
            generatedStyle = workbook.createCellStyle();
            generatedStyle.setFont(generatedFont);

            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle = baseStyle(workbook);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            wrapStyle = baseStyle(workbook);
            wrapStyle.setWrapText(true);
            wrapStyle.setVerticalAlignment(VerticalAlignment.TOP);

            centeredStyle = baseStyle(workbook);
            centeredStyle.setAlignment(HorizontalAlignment.CENTER);
            centeredStyle.setVerticalAlignment(VerticalAlignment.TOP);

            idStyle = baseStyle(workbook);
            Font idFont = workbook.createFont();
            idFont.setFontHeightInPoints((short) 8);
            idFont.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
            idStyle.setFont(idFont);
            idStyle.setVerticalAlignment(VerticalAlignment.TOP);

            dateStyle = baseStyle(workbook);
            dateStyle.setDataFormat(helper.createDataFormat().getFormat("dd mmm yyyy"));
            dateStyle.setAlignment(HorizontalAlignment.CENTER);
            dateStyle.setVerticalAlignment(VerticalAlignment.TOP);

            dateTimeStyle = baseStyle(workbook);
            dateTimeStyle.setDataFormat(helper.createDataFormat().getFormat("dd mmm yyyy hh:mm"));
            dateTimeStyle.setAlignment(HorizontalAlignment.CENTER);
            dateTimeStyle.setVerticalAlignment(VerticalAlignment.TOP);

            hyperlinkStyle = baseStyle(workbook);
            Font linkFont = workbook.createFont();
            linkFont.setUnderline(Font.U_SINGLE);
            linkFont.setColor(IndexedColors.BLUE.getIndex());
            hyperlinkStyle.setFont(linkFont);
            hyperlinkStyle.setWrapText(true);
            hyperlinkStyle.setVerticalAlignment(VerticalAlignment.TOP);

            statusStyles.put(PostStatus.DRAFT, statusStyle(workbook, IndexedColors.GREY_25_PERCENT));
            statusStyles.put(PostStatus.IN_REVIEW, statusStyle(workbook, IndexedColors.LIGHT_YELLOW));
            statusStyles.put(PostStatus.CHANGES_REQUESTED, statusStyle(workbook, IndexedColors.ROSE));
            statusStyles.put(PostStatus.APPROVED, statusStyle(workbook, IndexedColors.LIGHT_GREEN));
            statusStyles.put(PostStatus.POSTED, statusStyle(workbook, IndexedColors.GREEN));
            statusStyles.put(PostStatus.CANCELLED, statusStyle(workbook, IndexedColors.GREY_40_PERCENT));
        }

        private CellStyle baseStyle(XSSFWorkbook workbook) {
            CellStyle style = workbook.createCellStyle();
            style.setBorderTop(BorderStyle.THIN);
            style.setBorderBottom(BorderStyle.THIN);
            style.setBorderLeft(BorderStyle.THIN);
            style.setBorderRight(BorderStyle.THIN);
            return style;
        }

        private CellStyle statusStyle(XSSFWorkbook workbook, IndexedColors color) {
            CellStyle style = baseStyle(workbook);
            Font font = workbook.createFont();
            font.setBold(true);
            style.setFont(font);
            style.setFillForegroundColor(color.getIndex());
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            style.setWrapText(true);
            style.setAlignment(HorizontalAlignment.CENTER);
            style.setVerticalAlignment(VerticalAlignment.CENTER);
            return style;
        }

        private CellStyle assigneeStyle(UUID assigneeId) {
            return assigneeStyles.computeIfAbsent(assigneeId, id -> {
                CellStyle style = baseStyle(workbook);
                style.setFillForegroundColor(assigneePalette[Math.floorMod(id.hashCode(), assigneePalette.length)].getIndex());
                style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
                Font font = workbook.createFont();
                font.setBold(true);
                style.setFont(font);
                style.setWrapText(true);
                style.setVerticalAlignment(VerticalAlignment.CENTER);
                return style;
            });
        }

        private CellStyle statusStyle(PostStatus status) {
            return statusStyles.getOrDefault(status, wrapStyle);
        }

        private void setColumnWidths(Sheet sheet, int[] widths) {
            for (int i = 0; i < widths.length; i++) {
                sheet.setColumnWidth(i, widths[i] * 256);
            }
        }
    }
}
