package com.govgrants.subsidygrant.application.service;

import com.govgrants.subsidygrant.application.api.ApplicationResponse;
import com.govgrants.subsidygrant.application.api.ApplicationSummaryResponse;
import com.govgrants.subsidygrant.application.api.CreateApplicationRequest;
import com.govgrants.subsidygrant.application.api.UpdateApplicationRequest;
import com.govgrants.subsidygrant.application.mapper.ApplicationMapper;
import com.govgrants.subsidygrant.common.exception.BusinessRuleException;
import com.govgrants.subsidygrant.common.exception.DuplicateResourceException;
import com.govgrants.subsidygrant.common.exception.ResourceNotFoundException;
import com.govgrants.subsidygrant.entity.Application;
import com.govgrants.subsidygrant.entity.Beneficiary;
import com.govgrants.subsidygrant.entity.Scheme;
import com.govgrants.subsidygrant.enums.ApplicationStatus;
import com.govgrants.subsidygrant.enums.SchemeStatus;
import com.govgrants.subsidygrant.repository.ApplicationRepository;
import com.govgrants.subsidygrant.repository.BeneficiaryRepository;
import com.govgrants.subsidygrant.repository.SchemeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final BeneficiaryRepository beneficiaryRepository;
    private final SchemeRepository schemeRepository;
    private final ApplicationStatusTransitionValidator transitionValidator;
    private final ApplicationMapper applicationMapper;

    public ApplicationService(ApplicationRepository applicationRepository,
                               BeneficiaryRepository beneficiaryRepository,
                               SchemeRepository schemeRepository,
                               ApplicationStatusTransitionValidator transitionValidator,
                               ApplicationMapper applicationMapper) {
        this.applicationRepository = applicationRepository;
        this.beneficiaryRepository = beneficiaryRepository;
        this.schemeRepository = schemeRepository;
        this.transitionValidator = transitionValidator;
        this.applicationMapper = applicationMapper;
    }

    public ApplicationResponse createApplication(CreateApplicationRequest request) {
        Beneficiary beneficiary = beneficiaryRepository.findById(request.getBeneficiaryId())
                .orElseThrow(() -> new ResourceNotFoundException("Beneficiary not found: " + request.getBeneficiaryId()));

        Scheme scheme = schemeRepository.findById(request.getSchemeId())
                .orElseThrow(() -> new ResourceNotFoundException("Scheme not found: " + request.getSchemeId()));

        if (scheme.getStatus() != SchemeStatus.OPEN) {
            throw new BusinessRuleException("SCHEME_NOT_OPEN",
                    "Applications can only be submitted for OPEN schemes");
        }

        if (request.getRequestedAmount().compareTo(scheme.getMinGrantAmount()) < 0 ||
                request.getRequestedAmount().compareTo(scheme.getMaxGrantAmount()) > 0) {
            throw new BusinessRuleException("AMOUNT_OUT_OF_RANGE",
                    "Requested amount " + request.getRequestedAmount() + " is outside scheme range ["
                            + scheme.getMinGrantAmount() + ", " + scheme.getMaxGrantAmount() + "]");
        }

        if (applicationRepository.existsByReferenceNo(request.getReferenceNo())) {
            throw new DuplicateResourceException("Reference number already exists: " + request.getReferenceNo());
        }

        Application application = new Application();
        application.setBeneficiary(beneficiary);
        application.setScheme(scheme);
        application.setReferenceNo(request.getReferenceNo());
        application.setRequestedAmount(request.getRequestedAmount());
        application.setStatus(request.getStatus() != null ? request.getStatus() : ApplicationStatus.DRAFT);

        return applicationMapper.toResponse(applicationRepository.save(application));
    }

    @Transactional(readOnly = true)
    public Page<ApplicationSummaryResponse> listApplications(Pageable pageable) {
        return applicationRepository.findAll(pageable).map(applicationMapper::toSummaryResponse);
    }

    @Transactional(readOnly = true)
    public ApplicationResponse getById(UUID id) {
        return applicationMapper.toResponse(
                applicationRepository.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + id)));
    }

    @Transactional(readOnly = true)
    public ApplicationResponse getByReferenceNo(String referenceNo) {
        return applicationMapper.toResponse(
                applicationRepository.findByReferenceNo(referenceNo)
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Application not found with reference: " + referenceNo)));
    }

    @Transactional(readOnly = true)
    public Page<ApplicationSummaryResponse> listByBeneficiary(UUID beneficiaryId, Pageable pageable) {
        return applicationRepository.findByBeneficiaryId(beneficiaryId, pageable)
                .map(applicationMapper::toSummaryResponse);
    }

    @Transactional(readOnly = true)
    public Page<ApplicationSummaryResponse> listByScheme(UUID schemeId, Pageable pageable) {
        return applicationRepository.findBySchemeId(schemeId, pageable)
                .map(applicationMapper::toSummaryResponse);
    }

    public ApplicationResponse updateApplication(UUID id, UpdateApplicationRequest request) {
        Application application = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + id));

        Scheme scheme = application.getScheme();
        if (request.getRequestedAmount().compareTo(scheme.getMinGrantAmount()) < 0 ||
                request.getRequestedAmount().compareTo(scheme.getMaxGrantAmount()) > 0) {
            throw new BusinessRuleException("AMOUNT_OUT_OF_RANGE",
                    "Requested amount is outside scheme range");
        }

        application.setRequestedAmount(request.getRequestedAmount());
        return applicationMapper.toResponse(applicationRepository.save(application));
    }

    public ApplicationResponse updateStatus(UUID id, ApplicationStatus targetStatus) {
        Application application = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + id));

        transitionValidator.validate(application.getStatus(), targetStatus);
        application.setStatus(targetStatus);
        return applicationMapper.toResponse(applicationRepository.save(application));
    }

    public void deleteApplication(UUID id) {
        Application application = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + id));
        applicationRepository.delete(application);
    }
}
