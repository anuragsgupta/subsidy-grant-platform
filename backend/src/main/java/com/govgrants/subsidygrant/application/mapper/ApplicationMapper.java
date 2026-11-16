package com.govgrants.subsidygrant.application.mapper;

import com.govgrants.subsidygrant.application.api.ApplicationResponse;
import com.govgrants.subsidygrant.application.api.ApplicationSummaryResponse;
import com.govgrants.subsidygrant.entity.Application;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ApplicationMapper {

    @Mapping(target = "beneficiaryId", source = "beneficiary.id")
    @Mapping(target = "beneficiaryFullName", source = "beneficiary.fullName")
    @Mapping(target = "schemeId", source = "scheme.id")
    @Mapping(target = "schemeName", source = "scheme.name")
    @Mapping(target = "schemeCode", source = "scheme.code")
    ApplicationResponse toResponse(Application application);

    @Mapping(target = "beneficiaryId", source = "beneficiary.id")
    @Mapping(target = "beneficiaryFullName", source = "beneficiary.fullName")
    @Mapping(target = "schemeId", source = "scheme.id")
    @Mapping(target = "schemeCode", source = "scheme.code")
    ApplicationSummaryResponse toSummaryResponse(Application application);
}
