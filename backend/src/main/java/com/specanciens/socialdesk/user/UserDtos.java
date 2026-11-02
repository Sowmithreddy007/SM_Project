package com.specanciens.socialdesk.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class UserDtos {

    private UserDtos() {
    }

    public record UserDto(
            UUID id,
            String email,
            String fullName,
            Role role,
            boolean active,
            boolean mustChangePassword,
            Instant createdAt,
            Instant lastLoginAt
    ) {
        public static UserDto from(AppUser user) {
            return new UserDto(
                    user.getId(),
                    user.getEmail(),
                    user.getFullName(),
                    user.getRole(),
                    user.isActive(),
                    user.isMustChangePassword(),
                    user.getCreatedAt(),
                    user.getLastLoginAt()
            );
        }
    }

    public record UserOptionDto(UUID id, String fullName, String email, Role role) {
        public static UserOptionDto from(AppUser user) {
            return new UserOptionDto(user.getId(), user.getFullName(), user.getEmail(), user.getRole());
        }
    }

    public record CreateUserRequest(
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Size(min = 8, max = 100) String password,
            @NotNull Role role
    ) {
    }

    public record UpdateUserRequest(
            @NotBlank @Size(max = 120) String fullName,
            @NotNull Role role,
            boolean active
    ) {
    }

    public record ResetPasswordRequest(
            @NotBlank @Size(min = 8, max = 100) String password
    ) {
    }
}
