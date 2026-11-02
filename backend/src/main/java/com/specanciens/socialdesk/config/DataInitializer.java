package com.specanciens.socialdesk.config;

import com.specanciens.socialdesk.user.AppUser;
import com.specanciens.socialdesk.user.AppUserRepository;
import com.specanciens.socialdesk.user.Role;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties appProperties;

    public DataInitializer(
            AppUserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AppProperties appProperties
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.appProperties = appProperties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            return;
        }

        AppProperties.BootstrapAdmin bootstrap = appProperties.bootstrapAdmin();
        if (bootstrap == null
                || bootstrap.email() == null || bootstrap.email().isBlank()
                || bootstrap.password() == null || bootstrap.password().isBlank()) {
            throw new IllegalStateException(
                    "No users exist. Set APP_BOOTSTRAP_ADMIN_EMAIL, APP_BOOTSTRAP_ADMIN_PASSWORD, and APP_BOOTSTRAP_ADMIN_NAME."
            );
        }

        AppUser admin = new AppUser(
                bootstrap.email(),
                bootstrap.name() == null || bootstrap.name().isBlank() ? "Super Admin" : bootstrap.name(),
                passwordEncoder.encode(bootstrap.password()),
                Role.SUPER_ADMIN
        );
        admin.setMustChangePassword(false);
        userRepository.save(admin);
        log.info("Created bootstrap Super Admin account for {}", admin.getEmail());
    }
}
