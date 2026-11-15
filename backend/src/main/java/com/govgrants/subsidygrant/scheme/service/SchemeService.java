package com.govgrants.subsidygrant.scheme.service;

import com.govgrants.subsidygrant.common.exception.BusinessRuleException;
import com.govgrants.subsidygrant.common.exception.DuplicateResourceException;
import com.govgrants.subsidygrant.common.exception.ResourceInUseException;
import com.govgrants.subsidygrant.common.exception.ResourceNotFoundException;
import com.govgrants.subsidygrant.entity.Scheme;
import com.govgrants.subsidygrant.enums.SchemeStatus;
import com.govgrants.subsidygrant.repository.ApplicationRepository;
import com.govgrants.subsidygrant.repository.SchemeRepository;
import com.govgrants.subsidygrant.scheme.api.CreateSchemeRequest;
import com.govgrants.subsidygrant.scheme.api.SchemeResponse;
import com.govgrants.subsidygrant.scheme.api.SchemeSummaryResponse;
import com.govgrants.subsidygrant.scheme.api.UpdateSchemeRequest;
import com.govgrants.subsidygrant.scheme.mapper.SchemeMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class SchemeService {

    private final SchemeRepository schemeRepository;
    private final ApplicationRepository applicationRepository;
    private final SchemeMapper schemeMapper;

    public SchemeService(SchemeRepository schemeRepository,
                         ApplicationRepository applicationRepository,
                         SchemeMapper schemeMapper) {
        this.schemeRepository = schemeRepository;
        this.applicationRepository = applicationRepository;
        this.schemeMapper = schemeMapper;
    }

    public SchemeResponse createScheme(CreateSchemeRequest request) {
        if (schemeRepository.existsByCode(request.getCode())) {
            throw new DuplicateResourceException("Scheme code already exists: " + request.getCode());
        }
        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new BusinessRuleException("INVALID_DATE_RANGE", "Start date must not be after end date");
        }
        if (request.getMaxGrantAmount().compareTo(request.getMinGrantAmount()) < 0) {
            throw new BusinessRuleException("INVALID_AMOUNT_RANGE", "Maximum grant amount must be >= minimum grant amount");
        }
        Scheme scheme = new Scheme();
        scheme.setName(request.getName());
        scheme.setCode(request.getCode());
        scheme.setDescription(request.getDescription());
        scheme.setStartDate(request.getStartDate());
        scheme.setEndDate(request.getEndDate());
        scheme.setMinGrantAmount(request.getMinGrantAmount());
        scheme.setMaxGrantAmount(request.getMaxGrantAmount());
        scheme.setStatus(request.getStatus() != null ? request.getStatus() : SchemeStatus.DRAFT);
        return schemeMapper.toResponse(schemeRepository.save(scheme));
    }

    @Transactional(readOnly = true)
    public Page<SchemeSummaryResponse> listSchemes(Pageable pageable) {
        return schemeRepository.findAll(pageable).map(schemeMapper::toSummaryResponse);
    }

    @Transactional(readOnly = true)
    public SchemeResponse getById(UUID id) {
        return schemeMapper.toResponse(schemeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Scheme not found: " + id)));
    }

    @Transactional(readOnly = true)
    public SchemeResponse getByCode(String code) {
        return schemeMapper.toResponse(schemeRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Scheme not found with code: " + code)));
    }

    public SchemeResponse updateScheme(UUID id, UpdateSchemeRequest request) {
        Scheme scheme = schemeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Scheme not found: " + id));
        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new BusinessRuleException("INVALID_DATE_RANGE", "Start date must not be after end date");
        }
        if (request.getMaxGrantAmount().compareTo(request.getMinGrantAmount()) < 0) {
            throw new BusinessRuleException("INVALID_AMOUNT_RANGE", "Maximum grant amount must be >= minimum grant amount");
        }
        scheme.setName(request.getName());
        scheme.setDescription(request.getDescription());
        scheme.setStartDate(request.getStartDate());
        scheme.setEndDate(request.getEndDate());
        scheme.setMinGrantAmount(request.getMinGrantAmount());
        scheme.setMaxGrantAmount(request.getMaxGrantAmount());
        return schemeMapper.toResponse(schemeRepository.save(scheme));
    }

    public SchemeResponse updateStatus(UUID id, SchemeStatus status) {
        Scheme scheme = schemeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Scheme not found: " + id));
        scheme.setStatus(status);
        return schemeMapper.toResponse(schemeRepository.save(scheme));
    }

    public void deleteScheme(UUID id) {
        Scheme scheme = schemeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Scheme not found: " + id));
        if (applicationRepository.existsBySchemeId(id)) {
            throw new ResourceInUseException("Scheme has associated applications and cannot be deleted");
        }
        schemeRepository.delete(scheme);
    }
}
