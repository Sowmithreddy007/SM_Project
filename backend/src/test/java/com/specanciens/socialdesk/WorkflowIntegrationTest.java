package com.specanciens.socialdesk;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.specanciens.socialdesk.user.AppUser;
import com.specanciens.socialdesk.user.AppUserRepository;
import com.specanciens.socialdesk.user.Role;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WorkflowIntegrationTest {

    private static final String MEMBER_EMAIL = "member-it@example.com";
    private static final String MEMBER_PASSWORD = "MemberPass123!";
    private static final String ADMIN_EMAIL = "admin@specanciens.local";
    private static final String ADMIN_PASSWORD = "ChangeMe123!";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private UUID memberId;
    private MockHttpSession memberSession;
    private MockHttpSession adminSession;

    @BeforeEach
    void setUp() throws Exception {
        memberId = ensureMember();
        adminSession = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        memberSession = login(MEMBER_EMAIL, MEMBER_PASSWORD);
    }

    @Test
    void unauthenticatedRequestsAreRejected() throws Exception {
        mvc.perform(get("/api/posts")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/dashboard")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/exports/excel")).andExpect(status().isUnauthorized());
    }

    @Test
    void memberCannotAccessAdminEndpoints() throws Exception {
        mvc.perform(get("/api/users").session(memberSession)).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/exports/excel").session(memberSession)).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/backups").session(memberSession)).andExpect(status().isForbidden());
        mvc.perform(post("/api/users").session(memberSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"x@example.com","fullName":"X","password":"Password123!","role":"MEMBER"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void fullReviewAndPostingFlow() throws Exception {
        String postId = createPost(memberSession, "Integration approve flow", "POST", "2026-11-10");

        JsonNode prepared = prepareReview(postId, memberSession);
        String reviewId = prepared.get("reviewRequestId").asText();
        assertThat(prepared.get("reviewUrl").asText()).contains("/review/" + reviewId);
        assertThat(prepared.get("gmailComposeUrl").asText())
                .startsWith("https://mail.google.com/mail/?view=cm&fs=1");

        mvc.perform(post("/api/review-requests/{id}/mark-sent", reviewId).session(memberSession))
                .andExpect(status().isNoContent());
        assertThat(postStatus(postId, memberSession)).isEqualTo("IN_REVIEW");

        mvc.perform(post("/api/review-requests/{id}/approve", reviewId).session(memberSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"feedback\":\"nice\"}"))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/review-requests/{id}/approve", reviewId).session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"feedback\":\"Approved for publishing.\"}"))
                .andExpect(status().isOk());
        assertThat(postStatus(postId, memberSession)).isEqualTo("APPROVED");

        mvc.perform(post("/api/posts/{id}/mark-posted", postId).session(memberSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());

        mvc.perform(post("/api/posts/{id}/mark-posted", postId).session(memberSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"postedUrl\":\"https://instagram.com/p/integration\"}"))
                .andExpect(status().isOk());
        assertThat(postStatus(postId, memberSession)).isEqualTo("POSTED");
    }

    @Test
    void changesRequestedFlowCreatesSecondRound() throws Exception {
        String postId = createPost(memberSession, "Integration changes flow", "REEL", "2026-11-12");

        String firstReview = prepareReview(postId, memberSession).get("reviewRequestId").asText();
        mvc.perform(post("/api/review-requests/{id}/mark-sent", firstReview).session(memberSession))
                .andExpect(status().isNoContent());

        mvc.perform(post("/api/review-requests/{id}/request-changes", firstReview).session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"feedback\":\"   \"}"))
                .andExpect(status().isBadRequest());

        mvc.perform(post("/api/review-requests/{id}/request-changes", firstReview).session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"feedback\":\"Shorten the caption and add a CTA.\"}"))
                .andExpect(status().isOk());
        assertThat(postStatus(postId, memberSession)).isEqualTo("CHANGES_REQUESTED");

        mvc.perform(put("/api/posts/{id}", postId).session(memberSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(postPayload("Integration changes flow v2", "REEL", "2026-11-12")))
                .andExpect(status().isOk());

        JsonNode second = prepareReview(postId, memberSession);
        assertThat(second.get("reviewRequestId").asText()).isNotEqualTo(firstReview);

        String secondReview = second.get("reviewRequestId").asText();
        mvc.perform(post("/api/review-requests/{id}/mark-sent", secondReview).session(memberSession))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/review-requests/{id}/approve", secondReview).session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());

        JsonNode detail = getJson("/api/posts/" + postId, memberSession);
        assertThat(detail.get("status").asText()).isEqualTo("APPROVED");
        assertThat(detail.get("reviewRound").asInt()).isEqualTo(2);
        assertThat(detail.get("reviews").size()).isEqualTo(2);
        assertThat(detail.get("reviews").get(0).get("roundNumber").asInt()).isEqualTo(2);
    }

    @Test
    void storyDoesNotRequirePostedUrl() throws Exception {
        String postId = createPost(memberSession, "Integration story", "STORY", "2026-11-14");
        String reviewId = prepareReview(postId, memberSession).get("reviewRequestId").asText();
        mvc.perform(post("/api/review-requests/{id}/mark-sent", reviewId).session(memberSession))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/review-requests/{id}/approve", reviewId).session(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());

        mvc.perform(post("/api/posts/{id}/mark-posted", postId).session(memberSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());
        assertThat(postStatus(postId, memberSession)).isEqualTo("POSTED");
    }

    @Test
    void excelExportAndSnapshotWorkForSuperAdmin() throws Exception {
        createPost(memberSession, "Integration export row", "POST", "2026-11-20");

        MvcResult export = mvc.perform(get("/api/admin/exports/excel").session(adminSession))
                .andExpect(status().isOk())
                .andReturn();
        byte[] bytes = export.getResponse().getContentAsByteArray();
        assertThat(bytes.length).isGreaterThan(1000);
        assertThat(new String(bytes, 0, 2, StandardCharsets.US_ASCII)).isEqualTo("PK");
        assertThat(export.getResponse().getContentType())
                .isEqualTo("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        MvcResult snapshot = mvc.perform(post("/api/admin/backups/run").session(adminSession))
                .andExpect(status().isOk())
                .andReturn();
        String filename = objectMapper.readTree(snapshot.getResponse().getContentAsString()).get("filename").asText();
        assertThat(filename).endsWith(".xlsx");

        JsonNode backups = getJson("/api/admin/backups", adminSession);
        assertThat(backups.get("retentionDays").asInt()).isEqualTo(30);
        assertThat(backups.get("snapshots").size()).isGreaterThanOrEqualTo(1);
    }

    @Test
    void spaRoutesServeTheReactApplication() throws Exception {
        mvc.perform(get("/tracker")).andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
        mvc.perform(get("/posts/" + UUID.randomUUID() + "/edit")).andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
        mvc.perform(get("/some/unknown/client/route")).andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
        mvc.perform(get("/assets/app.js")).andExpect(status().isNotFound());
        mvc.perform(get("/api/does-not-exist").session(adminSession)).andExpect(status().isNotFound());
    }

    @Test
    void loginFailureReturnsUnauthorized() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"member-it@example.com\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized());
    }

    private UUID ensureMember() {
        AppUser member = userRepository.findByEmailIgnoreCase(MEMBER_EMAIL).orElseGet(() -> {
            AppUser created = new AppUser(
                    MEMBER_EMAIL,
                    "Integration Member",
                    passwordEncoder.encode(MEMBER_PASSWORD),
                    Role.MEMBER
            );
            created.setMustChangePassword(false);
            return userRepository.save(created);
        });
        return member.getId();
    }

    private MockHttpSession login(String email, String password) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    private String createPost(MockHttpSession session, String title, String type, String publishDate) throws Exception {
        MvcResult result = mvc.perform(post("/api/posts").session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(postPayload(title, type, publishDate)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
    }

    private String postPayload(String title, String type, String publishDate) {
        return """
                {"title":"%s","postType":"%s","platforms":["INSTAGRAM","FACEBOOK"],
                 "publishDate":"%s","assigneeId":"%s","driveUrl":"https://drive.google.com/file/d/it/view",
                 "caption":"Integration test caption.","notes":"created by tests"}
                """.formatted(title, type, publishDate, memberId);
    }

    private JsonNode prepareReview(String postId, MockHttpSession session) throws Exception {
        MvcResult result = mvc.perform(post("/api/posts/{id}/review-requests", postId).session(session))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode getJson(String path, MockHttpSession session) throws Exception {
        MvcResult result = mvc.perform(get(path).session(session))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String postStatus(String postId, MockHttpSession session) throws Exception {
        return getJson("/api/posts/" + postId, session).get("status").asText();
    }
}
