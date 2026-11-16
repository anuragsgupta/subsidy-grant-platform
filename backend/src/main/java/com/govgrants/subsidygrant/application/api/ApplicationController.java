package com.govgrants.subsidygrant.application.api;

import com.govgrants.subsidygrant.application.service.ApplicationService;
import com.govgrants.subsidygrant.common.response.ApiResponse;
import com.govgrants.subsidygrant.common.response.PagedResponse;
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
 * REST controller for grant application management.
 *
 * Requirements: 19.1–19.9, 20.1–20.7, 21.1–21.3, 22.1–22.5, 24, 26, 27
 */
@RestController
@RequestMapping("/api/v1/applications")
@Tag(name = "Applications", description = "Grant application management")
public class ApplicationController {

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 100;

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    // -------------------------------------------------------------------------
    // Create — REQ-APP-01
    // -------------------------------------------------------------------------

    @PostMapping
    @Operation(summary = "Submit a grant application")
    public ResponseEntity<ApiResponse<ApplicationResponse>> create(
            @Valid @RequestBody CreateApplicationRequest request) {
        ApplicationResponse response = applicationService.createApplication(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Application created successfully", response));
    }

    // -------------------------------------------------------------------------
    // List all — REQ-APP-02
    // -------------------------------------------------------------------------

    @GetMapping
    @Operation(summary = "List applications (paginated)")
    public ApiResponse<PagedResponse<ApplicationSummaryResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int safePage = Math.max(DEFAULT_PAGE, page);
        int safeSize = Math.min(MAX_SIZE, Math.max(1, size));
        PageRequest pageRequest = PageRequest.of(safePage, safeSize, Sort.by("createdAt").descending());
        Page<ApplicationSummaryResponse> result = applicationService.listApplications(pageRequest);
        return ApiResponse.success("Applications retrieved successfully", PagedResponse.from(result));
    }

    // -------------------------------------------------------------------------
    // Get by ID — REQ-APP-03
    // -------------------------------------------------------------------------

    @GetMapping("/{id}")
    @Operation(summary = "Get application by ID")
    public ApiResponse<ApplicationResponse> getById(@PathVariable UUID id) {
        return ApiResponse.success("Application retrieved successfully", applicationService.getById(id));
    }

    // -------------------------------------------------------------------------
    // Get by reference number — REQ-APP-04
    // -------------------------------------------------------------------------

    @GetMapping("/reference/{referenceNo}")
    @Operation(summary = "Get application by reference number")
    public ApiResponse<ApplicationResponse> getByReferenceNo(@PathVariable String referenceNo) {
        return ApiResponse.success("Application retrieved successfully",
                applicationService.getByReferenceNo(referenceNo));
    }

    // -------------------------------------------------------------------------
    // List by beneficiary — REQ-APP-05
    // -------------------------------------------------------------------------

    @GetMapping("/beneficiary/{beneficiaryId}")
    @Operation(summary = "List applications by beneficiary (paginated)")
    public ApiResponse<PagedResponse<ApplicationSummaryResponse>> listByBeneficiary(
            @PathVariable UUID beneficiaryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int safePage = Math.max(DEFAULT_PAGE, page);
        int safeSize = Math.min(MAX_SIZE, Math.max(1, size));
        PageRequest pageRequest = PageRequest.of(safePage, safeSize, Sort.by("createdAt").descending());
        Page<ApplicationSummaryResponse> result = applicationService.listByBeneficiary(beneficiaryId, pageRequest);
        return ApiResponse.success("Applications retrieved successfully", PagedResponse.from(result));
    }

    // -------------------------------------------------------------------------
    // List by scheme — REQ-APP-06
    // -------------------------------------------------------------------------

    @GetMapping("/scheme/{schemeId}")
    @Operation(summary = "List applications by scheme (paginated)")
    public ApiResponse<PagedResponse<ApplicationSummaryResponse>> listByScheme(
            @PathVariable UUID schemeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int safePage = Math.max(DEFAULT_PAGE, page);
        int safeSize = Math.min(MAX_SIZE, Math.max(1, size));
        PageRequest pageRequest = PageRequest.of(safePage, safeSize, Sort.by("createdAt").descending());
        Page<ApplicationSummaryResponse> result = applicationService.listByScheme(schemeId, pageRequest);
        return ApiResponse.success("Applications retrieved successfully", PagedResponse.from(result));
    }

    // -------------------------------------------------------------------------
    // Update — REQ-APP-07
    // -------------------------------------------------------------------------

    @PutMapping("/{id}")
    @Operation(summary = "Update application")
    public ApiResponse<ApplicationResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateApplicationRequest request) {
        return ApiResponse.success("Application updated successfully",
                applicationService.updateApplication(id, request));
    }

    // -------------------------------------------------------------------------
    // Change status — REQ-APP-08
    // -------------------------------------------------------------------------

    @PatchMapping("/{id}/status")
    @Operation(summary = "Change application status")
    public ApiResponse<ApplicationResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody ApplicationStatusRequest request) {
        return ApiResponse.success("Application status updated successfully",
                applicationService.updateStatus(id, request.getStatus()));
    }

    // -------------------------------------------------------------------------
    // Delete — REQ-APP-09
    // -------------------------------------------------------------------------

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete application")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        applicationService.deleteApplication(id);
        return ResponseEntity.noContent().build();
    }
}
