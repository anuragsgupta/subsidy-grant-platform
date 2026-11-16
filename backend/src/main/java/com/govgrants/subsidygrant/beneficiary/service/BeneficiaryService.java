package com.govgrants.subsidygrant.beneficiary.service;

import com.govgrants.subsidygrant.beneficiary.api.BeneficiaryResponse;
import com.govgrants.subsidygrant.beneficiary.api.BeneficiarySummaryResponse;
import com.govgrants.subsidygrant.beneficiary.api.CreateBeneficiaryRequest;
import com.govgrants.subsidygrant.beneficiary.api.UpdateBeneficiaryRequest;
import com.govgrants.subsidygrant.beneficiary.mapper.BeneficiaryMapper;
import com.govgrants.subsidygrant.auth.domain.AppUser;
import com.govgrants.subsidygrant.auth.repository.AppUserRepository;
import com.govgrants.subsidygrant.common.exception.DuplicateResourceException;
import com.govgrants.subsidygrant.common.exception.ResourceNotFoundException;
import com.govgrants.subsidygrant.entity.Beneficiary;
import com.govgrants.subsidygrant.enums.BeneficiaryType;
import com.govgrants.subsidygrant.repository.BeneficiaryRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class BeneficiaryService {

    private final BeneficiaryRepository beneficiaryRepository;
    private final AppUserRepository appUserRepository;
    private final BeneficiaryMapper beneficiaryMapper;

    public BeneficiaryService(BeneficiaryRepository beneficiaryRepository,
                               AppUserRepository appUserRepository,
                               BeneficiaryMapper beneficiaryMapper) {
        this.beneficiaryRepository = beneficiaryRepository;
        this.appUserRepository = appUserRepository;
        this.beneficiaryMapper = beneficiaryMapper;
    }

    public BeneficiaryResponse registerBeneficiary(CreateBeneficiaryRequest request) {
        // 1. Check duplicate identityReference
        if (beneficiaryRepository.existsByIdentityReference(request.getIdentityReference())) {
            throw new DuplicateResourceException("Identity reference already registered: " + request.getIdentityReference());
        }
        // 2. Check userId already linked
        if (request.getUserId() != null) {
            if (beneficiaryRepository.existsByUserId(request.getUserId())) {
                throw new DuplicateResourceException("User is already linked to another beneficiary");
            }
        }
        // 3. Build entity
        Beneficiary beneficiary = new Beneficiary();
        beneficiary.setBeneficiaryType(request.getBeneficiaryType());
        beneficiary.setFullName(request.getFullName());
        beneficiary.setIdentityReference(request.getIdentityReference());
        beneficiary.setEmail(request.getEmail());
        beneficiary.setPhone(request.getPhone());
        beneficiary.setAddress(request.getAddress());
        beneficiary.setRegionCode(request.getRegionCode());
        if (request.getUserId() != null) {
            AppUser user = appUserRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.getUserId()));
            beneficiary.setUser(user);
        }
        return beneficiaryMapper.toResponse(beneficiaryRepository.save(beneficiary));
    }

    @Transactional(readOnly = true)
    public Page<BeneficiarySummaryResponse> listBeneficiaries(Pageable pageable) {
        return beneficiaryRepository.findAll(pageable).map(beneficiaryMapper::toSummaryResponse);
    }

    @Transactional(readOnly = true)
    public BeneficiaryResponse getById(UUID id) {
        return beneficiaryMapper.toResponse(beneficiaryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Beneficiary not found: " + id)));
    }

    @Transactional(readOnly = true)
    public Page<BeneficiarySummaryResponse> listByRegion(String regionCode, Pageable pageable) {
        return beneficiaryRepository.findByRegionCode(regionCode, pageable)
            .map(beneficiaryMapper::toSummaryResponse);
    }

    @Transactional(readOnly = true)
    public Page<BeneficiarySummaryResponse> listByType(BeneficiaryType type, Pageable pageable) {
        return beneficiaryRepository.findByBeneficiaryType(type, pageable)
            .map(beneficiaryMapper::toSummaryResponse);
    }

    public BeneficiaryResponse updateBeneficiary(UUID id, UpdateBeneficiaryRequest request) {
        Beneficiary beneficiary = beneficiaryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Beneficiary not found: " + id));
        // Check identity reference uniqueness against other records
        if (request.getIdentityReference() != null &&
            !request.getIdentityReference().equals(beneficiary.getIdentityReference())) {
            if (beneficiaryRepository.existsByIdentityReference(request.getIdentityReference())) {
                throw new DuplicateResourceException("Identity reference already belongs to another beneficiary");
            }
        }
        beneficiary.setFullName(request.getFullName());
        if (request.getIdentityReference() != null) {
            beneficiary.setIdentityReference(request.getIdentityReference());
        }
        beneficiary.setEmail(request.getEmail());
        beneficiary.setPhone(request.getPhone());
        beneficiary.setAddress(request.getAddress());
        beneficiary.setRegionCode(request.getRegionCode());
        return beneficiaryMapper.toResponse(beneficiaryRepository.save(beneficiary));
    }

    public void deleteBeneficiary(UUID id) {
        Beneficiary beneficiary = beneficiaryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Beneficiary not found: " + id));
        beneficiaryRepository.delete(beneficiary);
    }
}
