package com.govgrants.subsidygrant.beneficiary.api;

import com.govgrants.subsidygrant.beneficiary.service.BeneficiaryService;
import com.govgrants.subsidygrant.common.response.ApiResponse;
import com.govgrants.subsidygrant.common.response.PagedResponse;
import com.govgrants.subsidygrant.enums.BeneficiaryType;
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
 * REST controller for beneficiary profile management.
 *
 * Requirements: 15.1–15.7, 16.1–16.5, 17.1–17.3, 18.1–18.2, 24, 26, 27
 */
@RestController
@RequestMapping("/api/v1/beneficiaries")
@Tag(name = "Beneficiaries", description = "Beneficiary profile management")
public class BeneficiaryController {

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 100;

    private final BeneficiaryService beneficiaryService;

    public BeneficiaryController(BeneficiaryService beneficiaryService) {
        this.beneficiaryService = beneficiaryService;
    }

    // -------------------------------------------------------------------------
    // Create — REQ-BEN-01
    // -------------------------------------------------------------------------

    @PostMapping
    @Operation(summary = "Register a beneficiary")
    public ResponseEntity<ApiResponse<BeneficiaryResponse>> create(
            @Valid @RequestBody CreateBeneficiaryRequest request) {
        BeneficiaryResponse response = beneficiaryService.registerBeneficiary(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Beneficiary registered successfully", response));
    }

    // -------------------------------------------------------------------------
    // List — REQ-BEN-02
    // -------------------------------------------------------------------------

    @GetMapping
    @Operation(summary = "List beneficiaries (paginated)")
    public ApiResponse<PagedResponse<BeneficiarySummaryResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int safePage = Math.max(DEFAULT_PAGE, page);
        int safeSize = Math.min(MAX_SIZE, Math.max(1, size));
        PageRequest pageRequest = PageRequest.of(safePage, safeSize, Sort.by("fullName").ascending());
        Page<BeneficiarySummaryResponse> result = beneficiaryService.listBeneficiaries(pageRequest);
        return ApiResponse.success("Beneficiaries retrieved successfully", PagedResponse.from(result));
    }

    // -------------------------------------------------------------------------
    // Get by ID — REQ-BEN-03
    // -------------------------------------------------------------------------

    @GetMapping("/{id}")
    @Operation(summary = "Get beneficiary by ID")
    public ApiResponse<BeneficiaryResponse> getById(@PathVariable UUID id) {
        return ApiResponse.success("Beneficiary retrieved successfully", beneficiaryService.getById(id));
    }

    // -------------------------------------------------------------------------
    // List by region — REQ-BEN-04
    // -------------------------------------------------------------------------

    @GetMapping("/region/{regionCode}")
    @Operation(summary = "List beneficiaries by region (paginated)")
    public ApiResponse<PagedResponse<BeneficiarySummaryResponse>> listByRegion(
            @PathVariable String regionCode,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int safePage = Math.max(DEFAULT_PAGE, page);
        int safeSize = Math.min(MAX_SIZE, Math.max(1, size));
        PageRequest pageRequest = PageRequest.of(safePage, safeSize, Sort.by("fullName").ascending());
        Page<BeneficiarySummaryResponse> result = beneficiaryService.listByRegion(regionCode, pageRequest);
        return ApiResponse.success("Beneficiaries retrieved successfully", PagedResponse.from(result));
    }

    // -------------------------------------------------------------------------
    // List by type — REQ-BEN-05
    // -------------------------------------------------------------------------

    @GetMapping("/type/{type}")
    @Operation(summary = "List beneficiaries by type (paginated)")
    public ApiResponse<PagedResponse<BeneficiarySummaryResponse>> listByType(
            @PathVariable BeneficiaryType type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int safePage = Math.max(DEFAULT_PAGE, page);
        int safeSize = Math.min(MAX_SIZE, Math.max(1, size));
        PageRequest pageRequest = PageRequest.of(safePage, safeSize, Sort.by("fullName").ascending());
        Page<BeneficiarySummaryResponse> result = beneficiaryService.listByType(type, pageRequest);
        return ApiResponse.success("Beneficiaries retrieved successfully", PagedResponse.from(result));
    }

    // -------------------------------------------------------------------------
    // Update — REQ-BEN-06
    // -------------------------------------------------------------------------

    @PutMapping("/{id}")
    @Operation(summary = "Update beneficiary")
    public ApiResponse<BeneficiaryResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateBeneficiaryRequest request) {
        return ApiResponse.success("Beneficiary updated successfully",
                beneficiaryService.updateBeneficiary(id, request));
    }

    // -------------------------------------------------------------------------
    // Delete — REQ-BEN-07
    // -------------------------------------------------------------------------

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete beneficiary")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        beneficiaryService.deleteBeneficiary(id);
        return ResponseEntity.noContent().build();
    }
}
