package com.govgrants.subsidygrant.beneficiary.mapper;

import com.govgrants.subsidygrant.beneficiary.api.BeneficiaryResponse;
import com.govgrants.subsidygrant.beneficiary.api.BeneficiarySummaryResponse;
import com.govgrants.subsidygrant.entity.Beneficiary;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface BeneficiaryMapper {

    @Mapping(target = "userId", source = "user.id")
    BeneficiaryResponse toResponse(Beneficiary beneficiary);

    @Mapping(target = "userId", source = "user.id")
    BeneficiarySummaryResponse toSummaryResponse(Beneficiary beneficiary);
}
