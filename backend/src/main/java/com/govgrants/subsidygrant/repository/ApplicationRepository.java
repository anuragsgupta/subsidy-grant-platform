package com.govgrants.subsidygrant.repository;

import com.govgrants.subsidygrant.entity.Application;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, UUID> {

    Optional<Application> findByReferenceNo(String referenceNo);

    boolean existsByReferenceNo(String referenceNo);

    boolean existsBySchemeId(UUID schemeId);

    boolean existsByBeneficiaryId(UUID beneficiaryId);

    Page<Application> findByBeneficiaryId(UUID beneficiaryId, Pageable pageable);

    Page<Application> findBySchemeId(UUID schemeId, Pageable pageable);
}
