package com.govgrants.subsidygrant.scheme.repository;

import com.govgrants.subsidygrant.scheme.domain.Scheme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SchemeRepository extends JpaRepository<Scheme, UUID>, JpaSpecificationExecutor<Scheme> {

    Optional<Scheme> findByCode(String code);

    boolean existsByCode(String code);

    @Query("SELECT s FROM Scheme s WHERE s.status = com.govgrants.subsidygrant.enums.SchemeStatus.OPEN " +
           "AND s.startDate <= :today AND s.endDate >= :today")
    List<Scheme> findAllOpenAndInWindow(@Param("today") LocalDate today);
}
