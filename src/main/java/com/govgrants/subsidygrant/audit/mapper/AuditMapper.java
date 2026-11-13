package com.govgrants.subsidygrant.audit.mapper;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.govgrants.subsidygrant.audit.api.AuditLogResponse;
import com.govgrants.subsidygrant.audit.domain.AuditLog;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

/**
 * MapStruct mapper that converts {@link AuditLog} entities to
 * {@link AuditLogResponse} DTOs.
 *
 * <p>The {@code oldValue} and {@code newValue} JSONB strings are deserialized to
 * generic {@link Object} via the {@code deserializeJson} default method so the
 * response contains structured JSON, not a raw string.
 *
 * REQ-AUD-03, AC-AUD-03.1
 */
@Mapper(componentModel = "spring")
public interface AuditMapper {

    @Mapping(source = "oldValue", target = "oldValue", qualifiedByName = "deserializeJson")
    @Mapping(source = "newValue", target = "newValue", qualifiedByName = "deserializeJson")
    AuditLogResponse toResponse(AuditLog auditLog);

    /**
     * Deserializes a JSONB string into a generic {@link Object} (typically a
     * Jackson {@code Map}). Returns null for blank input; falls back to the
     * raw string if deserialization fails.
     */
    @Named("deserializeJson")
    default Object deserializeJson(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return new ObjectMapper().readValue(json, Object.class);
        } catch (Exception e) {
            // fallback: return the raw string so data is never lost
            return json;
        }
    }
}
