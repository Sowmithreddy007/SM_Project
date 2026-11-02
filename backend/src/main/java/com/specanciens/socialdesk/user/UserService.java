package com.specanciens.socialdesk.user;

import com.specanciens.socialdesk.common.BusinessException;
import com.specanciens.socialdesk.common.NotFoundException;
import com.specanciens.socialdesk.user.UserDtos.CreateUserRequest;
import com.specanciens.socialdesk.user.UserDtos.ResetPasswordRequest;
import com.specanciens.socialdesk.user.UserDtos.UpdateUserRequest;
import com.specanciens.socialdesk.user.UserDtos.UserDto;
import com.specanciens.socialdesk.user.UserDtos.UserOptionDto;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(AppUserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<UserDto> list() {
        return userRepository.findAllByOrderByFullNameAsc().stream().map(UserDto::from).toList();
    }

    @Transactional(readOnly = true)
    public List<UserOptionDto> options() {
        return userRepository.findByActiveTrueOrderByFullNameAsc().stream().map(UserOptionDto::from).toList();
    }

    @Transactional(readOnly = true)
    public AppUser get(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found."));
    }

    @Transactional
    public UserDto create(CreateUserRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BusinessException("An account already exists for " + email + ".");
        }
        AppUser user = new AppUser(
                email,
                request.fullName(),
                passwordEncoder.encode(request.password()),
                request.role()
        );
        user.setMustChangePassword(true);
        return UserDto.from(userRepository.save(user));
    }

    @Transactional
    public UserDto update(UUID id, UpdateUserRequest request, AppUser currentUser) {
        AppUser user = get(id);
        boolean roleChanged = user.getRole() != request.role();
        boolean beingDeactivated = user.isActive() && !request.active();

        if (user.getId().equals(currentUser.getId()) && (roleChanged || beingDeactivated)) {
            throw new BusinessException("You cannot change your own role or deactivate your own account.");
        }

        if (user.getRole() == Role.SUPER_ADMIN
                && (roleChanged || beingDeactivated)
                && userRepository.countByRoleAndActiveTrue(Role.SUPER_ADMIN) <= 1) {
            throw new BusinessException("At least one active Super Admin is required.");
        }

        user.setFullName(request.fullName());
        user.setRole(request.role());
        user.setActive(request.active());
        return UserDto.from(user);
    }

    @Transactional
    public void resetPassword(UUID id, ResetPasswordRequest request) {
        AppUser user = get(id);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setMustChangePassword(true);
    }

    @Transactional
    public void changePassword(AppUser user, String currentPassword, String newPassword) {
        AppUser managed = get(user.getId());
        if (!passwordEncoder.matches(currentPassword, managed.getPasswordHash())) {
            throw new BusinessException("Your current password is incorrect.");
        }
        if (passwordEncoder.matches(newPassword, managed.getPasswordHash())) {
            throw new BusinessException("Choose a password different from your current password.");
        }
        managed.setPasswordHash(passwordEncoder.encode(newPassword));
        managed.setMustChangePassword(false);
    }

    @Transactional
    public void recordLogin(AppUser user) {
        AppUser managed = get(user.getId());
        managed.setLastLoginAt(Instant.now());
    }
}
