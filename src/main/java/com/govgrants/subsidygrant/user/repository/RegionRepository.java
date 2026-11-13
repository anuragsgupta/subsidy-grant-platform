package com.govgrants.subsidygrant.user.repository;

import com.govgrants.subsidygrant.user.domain.Region;
import com.govgrants.subsidygrant.user.domain.RegionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RegionRepository extends JpaRepository<Region, Long> {

    Optional<Region> findByCode(String code);

    boolean existsByCode(String code);

    List<Region> findByType(RegionType type);

    List<Region> findByParentId(Long parentId);

    List<Region> findByTypeAndParentId(RegionType type, Long parentId);

    @Query(value = """
            WITH RECURSIVE descendants AS (
                SELECT id FROM public.region WHERE id = :rootId
                UNION ALL
                SELECT r.id FROM public.region r
                INNER JOIN descendants d ON r.parent_id = d.id
            )
            SELECT id FROM descendants
            """, nativeQuery = true)
    List<Long> findDescendantIds(@Param("rootId") Long rootId);
}
