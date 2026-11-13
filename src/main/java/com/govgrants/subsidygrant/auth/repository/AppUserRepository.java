package com.govgrants.subsidygrant.auth.repository;

import com.govgrants.subsidygrant.auth.domain.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AppUserRepository extends JpaRepository<AppUser, UUID>, JpaSpecificationExecutor<AppUser> {

    // Existing methods retained:
    boolean existsByEmail(String email);

    Optional<AppUser> findByEmail(String email);

    boolean existsByAuthUserId(UUID authUserId);

    Optional<AppUser> findByAuthUserId(UUID authUserId);

    // New methods for auth (REQ-AUTH-01, REQ-AUTH-02):
    Optional<AppUser> findByUsername(String username);

    Optional<AppUser> findByUsernameIgnoreCase(String username);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);

    // Eager-load roles in one query (avoids N+1 in /auth/me and JWT filter)
    @Query("SELECT u FROM AppUser u LEFT JOIN FETCH u.userRoles ur LEFT JOIN FETCH ur.role WHERE u.id = :id")
    Optional<AppUser> findByIdWithRoles(@Param("id") UUID id);

    @Query("SELECT u FROM AppUser u LEFT JOIN FETCH u.userRoles ur LEFT JOIN FETCH ur.role WHERE u.username = :username")
    Optional<AppUser> findByUsernameWithRoles(@Param("username") String username);
}
