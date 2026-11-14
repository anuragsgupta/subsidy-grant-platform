package com.govgrants.subsidygrant.user.repository;

import com.govgrants.subsidygrant.user.domain.UserRegion;
import com.govgrants.subsidygrant.user.domain.UserRegionId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserRegionRepository extends JpaRepository<UserRegion, UserRegionId> {

    List<UserRegion> findByIdUserId(UUID userId);

    void deleteByIdUserId(UUID userId);

    @Query("SELECT ur.id.regionId FROM UserRegion ur WHERE ur.id.userId = :userId")
    List<Long> findRegionIdsByUserId(@Param("userId") UUID userId);

    @Query(value = "SELECT COUNT(*) FROM public.application WHERE assigned_field_officer_id = :officerId AND status = 'FIELD_PENDING'",
            nativeQuery = true)
    long countActiveFieldPendingByOfficer(@Param("officerId") UUID officerId);
}
