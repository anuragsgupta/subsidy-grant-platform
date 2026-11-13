package com.govgrants.subsidygrant.user.service;

import com.govgrants.subsidygrant.common.exception.ResourceNotFoundException;
import com.govgrants.subsidygrant.user.domain.Region;
import com.govgrants.subsidygrant.user.repository.RegionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Read-only implementation of {@link RegionQueryService}.
 */
@Service
@Transactional(readOnly = true)
public class RegionQueryServiceImpl implements RegionQueryService {

    private final RegionRepository regionRepository;

    public RegionQueryServiceImpl(RegionRepository regionRepository) {
        this.regionRepository = regionRepository;
    }

    @Override
    public Region getById(Long regionId) {
        return regionRepository.findById(regionId)
                .orElseThrow(() -> new ResourceNotFoundException("Region not found: " + regionId));
    }

    @Override
    public boolean isDescendantOf(Long regionId, Long ancestorId) {
        // getDescendantIds includes the root itself, so a region is always
        // a descendant of itself — this matches the "includes self" contract.
        return getDescendantIds(ancestorId).contains(regionId);
    }

    @Override
    public List<Long> getDescendantIds(Long regionId) {
        return regionRepository.findDescendantIds(regionId);
    }
}
