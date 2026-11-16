package com.govgrants.subsidygrant.user.service;

import com.govgrants.subsidygrant.auth.domain.AppUser;
import com.govgrants.subsidygrant.auth.repository.AppUserRepository;
import com.govgrants.subsidygrant.common.exception.ResourceNotFoundException;
import com.govgrants.subsidygrant.user.repository.UserRegionRepository;
import com.govgrants.subsidygrant.user.repository.UserRoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Read-only implementation of {@link UserQueryService}.
 *
 * <p>All methods run in a read-only transaction so no accidental writes can
 * originate from cross-slice lookups.
 */
@Service
@Transactional(readOnly = true)
public class UserQueryServiceImpl implements UserQueryService {

    private final AppUserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserRegionRepository userRegionRepository;

    public UserQueryServiceImpl(AppUserRepository userRepository,
                                 UserRoleRepository userRoleRepository,
                                 UserRegionRepository userRegionRepository) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.userRegionRepository = userRegionRepository;
    }

    @Override
    public AppUser getById(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    @Override
    public boolean hasRole(UUID userId, String roleName) {
        return userRoleRepository.existsByIdUserIdAndRoleName(userId, roleName);
    }

    @Override
    public List<Long> getRegionIds(UUID userId) {
        return userRegionRepository.findRegionIdsByUserId(userId);
    }
}
