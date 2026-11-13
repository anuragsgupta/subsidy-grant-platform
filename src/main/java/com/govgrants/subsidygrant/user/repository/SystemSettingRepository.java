package com.govgrants.subsidygrant.user.repository;

import com.govgrants.subsidygrant.user.domain.SystemSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for {@link SystemSetting} (REQ-USR-04).
 * {@code findById(key)} and {@code save(setting)} cover all use cases, so no
 * custom query methods are required.
 */
@Repository
public interface SystemSettingRepository extends JpaRepository<SystemSetting, String> {
}
