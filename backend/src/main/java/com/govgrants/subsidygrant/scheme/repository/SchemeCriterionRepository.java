package com.govgrants.subsidygrant.scheme.repository;

import com.govgrants.subsidygrant.scheme.domain.SchemeCriterion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SchemeCriterionRepository extends JpaRepository<SchemeCriterion, UUID> {

    List<SchemeCriterion> findBySchemeIdOrderByCreatedAtAsc(UUID schemeId);

    long countBySchemeId(UUID schemeId);

    void deleteBySchemeId(UUID schemeId);
}
