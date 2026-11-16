package com.govgrants.subsidygrant.user.api;

import com.govgrants.subsidygrant.common.domain.ActorContext;
import com.govgrants.subsidygrant.common.exception.AccessDeniedException;
import com.govgrants.subsidygrant.common.response.ApiResponse;
import com.govgrants.subsidygrant.user.service.SettingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for system settings (REQ-USR-04).
 *
 * <p>All endpoints require ADMIN. Settings are seeded; unknown keys return 404.
 * The GET endpoint returns all settings; the PUT endpoint updates a single
 * setting by key, validates the value, evicts the cache, and writes an audit
 * entry (AC-USR-04.1–04.3).
 *
 * AC-USR-04.1, AC-USR-04.2
 */
@RestController
@RequestMapping("/api/v1/settings")
public class SettingController {

    private static final String ACTOR_CONTEXT_ATTR = "actorContext";

    private final SettingService settingService;

    public SettingController(SettingService settingService) {
        this.settingService = settingService;
    }

    @GetMapping
    public ApiResponse<List<SettingResponse>> getAll(HttpServletRequest httpRequest) {
        ActorContext actor = requireAdmin(httpRequest);
        List<SettingResponse> settings = settingService.getAllSettings(actor);
        return ApiResponse.success("Settings retrieved", settings);
    }

    @PutMapping("/{key}")
    public ApiResponse<SettingResponse> update(@PathVariable String key,
                                               @Valid @RequestBody UpdateSettingRequest request,
                                               HttpServletRequest httpRequest) {
        ActorContext actor = requireAdmin(httpRequest);
        SettingResponse setting = settingService.updateSetting(key, request, actor);
        return ApiResponse.success("Setting updated", setting);
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
            throw new AccessDeniedException("Only ADMIN may manage settings");
        }
        return actor;
    }
}
