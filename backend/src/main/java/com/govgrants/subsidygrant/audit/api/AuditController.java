package com.govgrants.subsidygrant.audit.api;

import com.govgrants.subsidygrant.audit.service.AuditFilter;
import com.govgrants.subsidygrant.audit.service.AuditService;
import com.govgrants.subsidygrant.common.domain.ActorContext;
import com.govgrants.subsidygrant.common.exception.AccessDeniedException;
import com.govgrants.subsidygrant.common.response.ApiResponse;
import com.govgrants.subsidygrant.common.response.PagedResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

/**
 * REST controller for the audit log query endpoint (REQ-AUD-03).
 *
 * <p>Only ADMIN may access audit data (INV-01: beneficiaries and officers never
 * see audit logs). The endpoint supports filtered, paginated queries.
 *
 * AC-AUD-03.1, AC-AUD-03.2
 */
@RestController
@RequestMapping("/api/v1/audit")
public class AuditController {

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 100;

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    /**
     * GET /api/v1/audit — filtered, paginated audit log query (AC-AUD-03.1).
     *
     * @param referenceNo optional filter by application reference number
     * @param entityType  optional filter by entity type
     * @param entityId     optional filter by entity ID
     * @param actorId      optional filter by actor user ID
     * @param from         optional lower bound on occurred_at (inclusive)
     * @param to            optional upper bound on occurred_at (inclusive)
     * @param page         zero-based page index (default 0)
     * @param size         page size (default 20, max 100)
     */
    @GetMapping
    public ApiResponse<PagedResponse<AuditLogResponse>> queryAudit(
            @RequestParam(required = false) String referenceNo,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String entityId,
            @RequestParam(required = false) UUID actorId,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size,
            HttpServletRequest request) {

        ActorContext actor = (ActorContext) request.getAttribute("actorContext");
        if (actor == null || !actor.hasRole("ADMIN")) {
            throw new AccessDeniedException("Only ADMIN may access audit logs");
        }

        int safePage = Math.max(DEFAULT_PAGE, page);
        int safeSize = Math.min(MAX_SIZE, Math.max(1, size));

        AuditFilter filter = new AuditFilter(referenceNo, entityType, entityId, actorId, from, to);
        // Sort by occurred_at ASC, id ASC (AC-AUD-03.1)
        Pageable pageable = PageRequest.of(safePage, safeSize,
                Sort.by("occurredAt").ascending().and(Sort.by("id").ascending()));

        var resultPage = auditService.queryAudit(filter, pageable);
        return ApiResponse.success("Audit log query successful", PagedResponse.from(resultPage));
    }
}
