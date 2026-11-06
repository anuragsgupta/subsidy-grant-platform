package com.govgrants.subsidygrant.repository;

import com.govgrants.subsidygrant.entity.UserRole;
import com.govgrants.subsidygrant.entity.UserRoleId;
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
}
