package com.govgrants.subsidygrant.eligibility.repository;

import com.govgrants.subsidygrant.eligibility.domain.EligibilityResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EligibilityResultRepository extends JpaRepository<EligibilityResult, UUID> {
    List<EligibilityResult> findByApplicationId(UUID applicationId);
}
