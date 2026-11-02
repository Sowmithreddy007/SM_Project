package com.specanciens.socialdesk.user;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

    Optional<AppUser> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<AppUser> findAllByOrderByFullNameAsc();

    List<AppUser> findByActiveTrueOrderByFullNameAsc();

    long countByRoleAndActiveTrue(Role role);

    java.util.Optional<AppUser> findFirstByRoleAndActiveTrueOrderByFullNameAsc(Role role);
}
