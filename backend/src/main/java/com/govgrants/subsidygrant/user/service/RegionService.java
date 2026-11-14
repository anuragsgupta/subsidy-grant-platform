package com.govgrants.subsidygrant.user.service;

import com.govgrants.subsidygrant.audit.service.AuditEntry;
import com.govgrants.subsidygrant.audit.service.AuditService;
import com.govgrants.subsidygrant.common.domain.ActorContext;
import com.govgrants.subsidygrant.common.exception.DuplicateResourceException;
import com.govgrants.subsidygrant.common.exception.ResourceNotFoundException;
import com.govgrants.subsidygrant.common.exception.BusinessRuleException;
import com.govgrants.subsidygrant.user.api.CreateRegionRequest;
import com.govgrants.subsidygrant.user.api.RegionResponse;
import com.govgrants.subsidygrant.user.api.UpdateRegionRequest;
import com.govgrants.subsidygrant.user.domain.Region;
import com.govgrants.subsidygrant.user.domain.RegionType;
import com.govgrants.subsidygrant.user.repository.RegionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Region management service implementing REQ-USR-03 (AC-USR-03.1–03.2).
 *
 * <p>Regions form a two-level hierarchy: STATE → DISTRICT (D-18). A DISTRICT
 * must have a STATE parent. Regions cannot be deleted (AC-USR-03.2 — no delete
 * endpoint is exposed).
 *
 * REQ-USR-03, D-18
 */
@Service
@Transactional
public class RegionService {

    private final RegionRepository regionRepository;
    private final AuditService auditService;

    public RegionService(RegionRepository regionRepository, AuditService auditService) {
        this.regionRepository = regionRepository;
        this.auditService = auditService;
    }

    // -------------------------------------------------------------------------
    // AC-USR-03.2 — Create region
    // -------------------------------------------------------------------------

    /**
     * Creates a new region. Validates code uniqueness and, for DISTRICT type,
     * that the parent exists and is a STATE.
     *
     * @param request validated creation payload
     * @param actor   the admin performing the action
     * @return the created region
     */
    public RegionResponse createRegion(CreateRegionRequest request, ActorContext actor) {
        // Code uniqueness (409 on duplicate)
        if (regionRepository.existsByCode(request.code())) {
            throw new DuplicateResourceException("Region code already exists: " + request.code());
        }

        // Validate DISTRICT parent
        Long parentId = null;
        if (request.type() == RegionType.DISTRICT) {
            if (request.parentId() == null) {
                throw new BusinessRuleException("INVALID_REGION_BINDING",
                        "A DISTRICT must have a parent STATE");
            }
            Region parent = regionRepository.findById(request.parentId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Parent region not found: " + request.parentId()));
            if (parent.getType() != RegionType.STATE) {
                throw new BusinessRuleException("INVALID_REGION_BINDING",
                        "District parent must be a STATE");
            }
            parentId = parent.getId();
        }

        Region region = Region.builder()
                .code(request.code())
                .name(request.name())
                .type(request.type())
                .parentId(parentId)
                .build();
        region = regionRepository.save(region);

        // Audit (AC-AUD-01.1)
        Map<String, Object> newValue = new LinkedHashMap<>();
        newValue.put("code", region.getCode());
        newValue.put("name", region.getName());
        newValue.put("type", region.getType().name());
        newValue.put("parentId", region.getParentId());
        auditService.record(new AuditEntry(
                "REGION_CREATED", "REGION", region.getId().toString(), null,
                null, newValue, "Region created"
        ), actor);

        return toResponse(region);
    }

    // -------------------------------------------------------------------------
    // AC-USR-03.2 — Update region (name only)
    // -------------------------------------------------------------------------

    /**
     * Updates the region name. Code and type are immutable after creation.
     *
     * @param id      the region ID
     * @param request validated update payload
     * @param actor   the admin performing the action
     * @return the updated region
     */
    public RegionResponse updateRegion(Long id, UpdateRegionRequest request, ActorContext actor) {
        Region region = regionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Region not found: " + id));

        Map<String, Object> oldValue = new LinkedHashMap<>();
        oldValue.put("name", region.getName());

        region.setName(request.name());
        region = regionRepository.save(region);

        Map<String, Object> newValue = new LinkedHashMap<>();
        newValue.put("name", region.getName());
        auditService.record(new AuditEntry(
                "REGION_UPDATED", "REGION", id.toString(), null,
                oldValue, newValue, "Region name updated"
        ), actor);

        return toResponse(region);
    }

    // -------------------------------------------------------------------------
    // AC-USR-03.1 — Read regions
    // -------------------------------------------------------------------------

    /**
     * Returns a single region by ID, or 404 if missing.
     */
    @Transactional(readOnly = true)
    public RegionResponse getRegion(Long id) {
        Region region = regionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Region not found: " + id));
        return toResponse(region);
    }

    /**
     * Lists regions with optional type and parentId filters.
     */
    @Transactional(readOnly = true)
    public List<RegionResponse> listRegions(RegionType type, Long parentId) {
        List<Region> regions;
        if (type != null && parentId != null) {
            regions = regionRepository.findByTypeAndParentId(type, parentId);
        } else if (type != null) {
            regions = regionRepository.findByType(type);
        } else if (parentId != null) {
            regions = regionRepository.findByParentId(parentId);
        } else {
            regions = regionRepository.findAll();
        }
        return regions.stream()
                .map(this::toResponse)
                .toList();
    }

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    private RegionResponse toResponse(Region region) {
        return new RegionResponse(
                region.getId(),
                region.getCode(),
                region.getName(),
                region.getType(),
                region.getParentId()
        );
    }
}
