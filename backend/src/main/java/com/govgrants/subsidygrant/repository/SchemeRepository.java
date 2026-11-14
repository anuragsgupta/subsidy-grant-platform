package com.govgrants.subsidygrant.repository;

import com.govgrants.subsidygrant.entity.Scheme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SchemeRepository extends JpaRepository<Scheme, UUID> {

    Optional<Scheme> findByCode(String code);

    boolean existsByCode(String code);
}
