package com.govgrants.subsidygrant.scheme.mapper;

import com.govgrants.subsidygrant.entity.Scheme;
import com.govgrants.subsidygrant.scheme.api.SchemeResponse;
import com.govgrants.subsidygrant.scheme.api.SchemeSummaryResponse;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface SchemeMapper {
    SchemeResponse toResponse(Scheme scheme);
    SchemeSummaryResponse toSummaryResponse(Scheme scheme);
}
