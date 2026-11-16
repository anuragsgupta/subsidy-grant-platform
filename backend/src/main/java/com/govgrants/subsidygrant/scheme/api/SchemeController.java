package com.govgrants.subsidygrant.scheme.api;

import com.govgrants.subsidygrant.common.response.ApiResponse;
import com.govgrants.subsidygrant.common.response.PagedResponse;
import com.govgrants.subsidygrant.enums.SchemeStatus;
import com.govgrants.subsidygrant.scheme.service.SchemeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for government subsidy and grant scheme management.
 *
 * Requirements: 10.1, 11.1–11.5, 12.1–12.4, 13.1–13.3, 14.1–14.3, 24, 26, 27
 */
@RestController
@RequestMapping("/api/v1/schemes")
@Tag(name = "Schemes", description = "Government subsidy and grant scheme management")
public class SchemeController {

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 100;

    private final SchemeService schemeService;

    public SchemeController(SchemeService schemeService) {
        this.schemeService = schemeService;
    }

    // -------------------------------------------------------------------------
    // Create — REQ-SCH-01
    // -------------------------------------------------------------------------

    @PostMapping
    @Operation(summary = "Create a scheme")
    public ResponseEntity<ApiResponse<SchemeResponse>> create(
            @Valid @RequestBody CreateSchemeRequest request) {
        SchemeResponse response = schemeService.createScheme(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Scheme created successfully", response));
    }

    // -------------------------------------------------------------------------
    // List — REQ-SCH-02
    // -------------------------------------------------------------------------

    @GetMapping
    @Operation(summary = "List schemes (paginated)")
    public ApiResponse<PagedResponse<SchemeSummaryResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort) {
        int safePage = Math.max(DEFAULT_PAGE, page);
        int safeSize = Math.min(MAX_SIZE, Math.max(1, size));
        PageRequest pageRequest = PageRequest.of(safePage, safeSize, Sort.by("name").ascending());
        Page<SchemeSummaryResponse> result = schemeService.listSchemes(pageRequest);
        return ApiResponse.success("Schemes retrieved successfully", PagedResponse.from(result));
    }

    // -------------------------------------------------------------------------
    // Get by ID — REQ-SCH-03
    // -------------------------------------------------------------------------

    @GetMapping("/{id}")
    @Operation(summary = "Get scheme by ID")
    public ApiResponse<SchemeResponse> getById(@PathVariable UUID id) {
        return ApiResponse.success("Scheme retrieved successfully", schemeService.getById(id));
    }

    // -------------------------------------------------------------------------
    // Get by code — REQ-SCH-04
    // -------------------------------------------------------------------------

    @GetMapping("/code/{code}")
    @Operation(summary = "Get scheme by code")
    public ApiResponse<SchemeResponse> getByCode(@PathVariable String code) {
        return ApiResponse.success("Scheme retrieved successfully", schemeService.getByCode(code));
    }

    // -------------------------------------------------------------------------
    // Update — REQ-SCH-05
    // -------------------------------------------------------------------------

    @PutMapping("/{id}")
    @Operation(summary = "Update scheme")
    public ApiResponse<SchemeResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateSchemeRequest request) {
        return ApiResponse.success("Scheme updated successfully", schemeService.updateScheme(id, request));
    }

    // -------------------------------------------------------------------------
    // Change status — REQ-SCH-06
    // -------------------------------------------------------------------------

    @PatchMapping("/{id}/status")
    @Operation(summary = "Change scheme status")
    public ApiResponse<SchemeResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody SchemeStatusRequest request) {
        return ApiResponse.success("Scheme status updated successfully",
                schemeService.updateStatus(id, request.getStatus()));
    }

    // -------------------------------------------------------------------------
    // Delete — REQ-SCH-07
    // -------------------------------------------------------------------------

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete scheme")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        schemeService.deleteScheme(id);
        return ResponseEntity.noContent().build();
    }
}
