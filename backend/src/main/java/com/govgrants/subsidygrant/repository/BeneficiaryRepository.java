package com.govgrants.subsidygrant.repository;

import com.govgrants.subsidygrant.entity.Beneficiary;
import com.govgrants.subsidygrant.enums.BeneficiaryType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BeneficiaryRepository extends JpaRepository<Beneficiary, UUID> {

    Optional<Beneficiary> findByIdentityReference(String identityReference);

    boolean existsByIdentityReference(String identityReference);

    boolean existsByUserId(UUID userId);

    Optional<Beneficiary> findByUserId(UUID userId);

    Page<Beneficiary> findByRegionCode(String regionCode, Pageable pageable);

    Page<Beneficiary> findByBeneficiaryType(BeneficiaryType beneficiaryType, Pageable pageable);
}
