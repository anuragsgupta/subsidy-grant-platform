package com.govgrants.subsidygrant.user.mapper;

import com.govgrants.subsidygrant.user.api.RegionResponse;
import com.govgrants.subsidygrant.user.domain.Region;
import org.mapstruct.Mapper;

/**
 * MapStruct mapper that converts {@link Region} entities to
 * {@link RegionResponse} DTOs.
 *
 * <p>The mapping is a straightforward field-to-field copy; no custom
 * conversions are required.
 *
 * REQ-USR-03
 */
@Mapper(componentModel = "spring")
public interface RegionMapper {

    RegionResponse toResponse(Region region);
}
