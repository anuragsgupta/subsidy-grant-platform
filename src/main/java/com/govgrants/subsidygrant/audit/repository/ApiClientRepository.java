package com.govgrants.subsidygrant.audit.repository;

import com.govgrants.subsidygrant.audit.domain.ApiClient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link ApiClient} — used by integration endpoints to validate
 * API keys (treasury confirmations, beneficiary-DB lookups).
 *
 * REQ-AUD-01
 */
@Repository
public interface ApiClientRepository extends JpaRepository<ApiClient, UUID> {

    Optional<ApiClient> findByName(String name);

    Optional<ApiClient> findByKeyHash(String keyHash);
}
