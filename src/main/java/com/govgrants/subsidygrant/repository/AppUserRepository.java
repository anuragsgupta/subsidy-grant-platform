package com.govgrants.subsidygrant.repository;

import com.govgrants.subsidygrant.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

    boolean existsByEmail(String email);

    Optional<AppUser> findByEmail(String email);

    boolean existsByAuthUserId(UUID authUserId);

    Optional<AppUser> findByAuthUserId(UUID authUserId);
}
