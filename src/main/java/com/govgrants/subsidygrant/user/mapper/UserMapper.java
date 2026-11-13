package com.govgrants.subsidygrant.user.mapper;

import com.govgrants.subsidygrant.auth.domain.AppUser;
import com.govgrants.subsidygrant.user.api.UserResponse;
import com.govgrants.subsidygrant.user.api.UserSummaryResponse;
import com.govgrants.subsidygrant.user.repository.UserRegionRepository;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

/**
 * MapStruct mapper for {@link AppUser} → response DTOs.
 *
 * <p>Role name is resolved from the {@code userRoles} collection (the first
 * entry's role name). Region IDs are fetched from {@link UserRegionRepository}
 * which is injected as a Spring component via the abstract-class strategy.
 *
 * REQ-USR-01
 */
@Mapper(componentModel = "spring")
public abstract class UserMapper {

    @Autowired
    protected UserRegionRepository userRegionRepository;

    /**
     * Maps an {@link AppUser} to a full {@link UserResponse}.
     * The role name is resolved from the loaded {@code userRoles} set.
     * Region IDs are loaded from the repository.
     */
    @Mapping(target = "role", expression = "java(extractRoleName(user))")
    @Mapping(target = "regionIds", expression = "java(userRegionRepository.findRegionIdsByUserId(user.getId()))")
    public abstract UserResponse toResponse(AppUser user);

    /**
     * Maps an {@link AppUser} to a lightweight {@link UserSummaryResponse}.
     * The role name is resolved from the loaded {@code userRoles} set.
     */
    @Mapping(target = "role", expression = "java(extractRoleName(user))")
    public abstract UserSummaryResponse toSummaryResponse(AppUser user);

    /**
     * Extracts the single role name from the user's role set (D-15).
     * Returns null if no role is assigned.
     */
    protected String extractRoleName(AppUser user) {
        if (user.getUserRoles() == null || user.getUserRoles().isEmpty()) {
            return null;
        }
        return user.getUserRoles().stream()
                .findFirst()
                .map(ur -> ur.getRole().getName())
                .orElse(null);
    }

    /**
     * Maps a list of {@link AppUser} entities to a list of {@link UserSummaryResponse} DTOs.
     */
    public List<UserSummaryResponse> toSummaryResponseList(List<AppUser> users) {
        return users.stream().map(this::toSummaryResponse).toList();
    }
}
