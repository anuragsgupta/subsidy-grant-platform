package com.govgrants.subsidygrant.user.api;

import com.govgrants.subsidygrant.common.domain.ActorContext;
import com.govgrants.subsidygrant.common.exception.AccessDeniedException;
import com.govgrants.subsidygrant.common.response.ApiResponse;
import com.govgrants.subsidygrant.user.domain.RegionType;
import com.govgrants.subsidygrant.user.service.RegionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for region management (REQ-USR-03).
 *
 * <p>GET endpoints are available to any authenticated user. POST and PUT
 * require ADMIN. No DELETE endpoint is exposed (AC-USR-03.2).
 *
 * AC-USR-03.1, AC-USR-03.2, D-18
 */
@RestController
@RequestMapping("/api/v1/regions")
public class RegionController {

    private static final String ACTOR_CONTEXT_ATTR = "actorContext";

    private final RegionService regionService;

    public RegionController(RegionService regionService) {
        this.regionService = regionService;
    }

    // -------------------------------------------------------------------------
    // AC-USR-03.1 — Read regions (any authenticated user)
    // -------------------------------------------------------------------------

    @GetMapping
    public ApiResponse<List<RegionResponse>> list(
            @RequestParam(required = false) RegionType type,
            @RequestParam(required = false) Long parentId) {
        List<RegionResponse> regions = regionService.listRegions(type, parentId);
        return ApiResponse.success("Regions retrieved", regions);
    }

    @GetMapping("/{id}")
    public ApiResponse<RegionResponse> get(@PathVariable Long id) {
        RegionResponse region = regionService.getRegion(id);
        return ApiResponse.success("Region retrieved", region);
    }

    // -------------------------------------------------------------------------
    // AC-USR-03.2 — Create/update regions (ADMIN only)
    // -------------------------------------------------------------------------

    @PostMapping
    public ResponseEntity<ApiResponse<RegionResponse>> create(
            @Valid @RequestBody CreateRegionRequest request,
            HttpServletRequest httpRequest) {
        ActorContext actor = requireAdmin(httpRequest);
        RegionResponse region = regionService.createRegion(request, actor);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Region created", region));
    }

    @PutMapping("/{id}")
    public ApiResponse<RegionResponse> update(@PathVariable Long id,
                                               @Valid @RequestBody UpdateRegionRequest request,
                                               HttpServletRequest httpRequest) {
        ActorContext actor = requireAdmin(httpRequest);
        RegionResponse region = regionService.updateRegion(id, request, actor);
        return ApiResponse.success("Region updated", region);
    }

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    /**
     * Extracts the ActorContext and verifies the caller is an ADMIN.
     */
    private ActorContext requireAdmin(HttpServletRequest request) {
        ActorContext actor = (ActorContext) request.getAttribute(ACTOR_CONTEXT_ATTR);
        if (actor == null || !actor.hasRole("ADMIN")) {
            throw new AccessDeniedException("Only ADMIN may manage regions");
        }
        return actor;
    }
}
