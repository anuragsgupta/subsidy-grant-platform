package com.govgrants.subsidygrant.user.repository;

import com.govgrants.subsidygrant.user.domain.UserRole;
import com.govgrants.subsidygrant.user.domain.UserRoleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {

    @Query("SELECT ur FROM UserRole ur JOIN FETCH ur.role WHERE ur.id.userId = :userId")
    List<UserRole> findByUserIdWithRole(@Param("userId") UUID userId);

    List<UserRole> findByIdUserId(UUID userId);

    void deleteByIdUserIdAndIdRoleId(UUID userId, Long roleId);

    boolean existsByIdUserIdAndIdRoleId(UUID userId, Long roleId);

    // New methods (REQ-USR-01.7, REQ-USR-01.8):
    void deleteByIdUserId(UUID userId);

    @Query("SELECT CASE WHEN COUNT(ur) > 0 THEN true ELSE false END FROM UserRole ur WHERE ur.id.userId = :userId AND ur.role.name = :roleName")
    boolean existsByIdUserIdAndRoleName(@Param("userId") UUID userId, @Param("roleName") String roleName);
}
