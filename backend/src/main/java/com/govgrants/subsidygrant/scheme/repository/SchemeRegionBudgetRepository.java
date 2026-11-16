package com.govgrants.subsidygrant.scheme.repository;

import com.govgrants.subsidygrant.scheme.domain.SchemeRegionBudget;
import com.govgrants.subsidygrant.scheme.domain.SchemeRegionBudgetId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SchemeRegionBudgetRepository extends JpaRepository<SchemeRegionBudget, SchemeRegionBudgetId> {

    List<SchemeRegionBudget> findByIdSchemeId(UUID schemeId);

    Optional<SchemeRegionBudget> findByIdSchemeIdAndIdRegionId(UUID schemeId, Long regionId);

    boolean existsByIdSchemeIdAndAllocatedGreaterThan(UUID schemeId, BigDecimal amount);
}
