package com.govgrants.subsidygrant.scheme.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.Objects;
import java.util.UUID;

@Embeddable
@NoArgsConstructor
@AllArgsConstructor
public class SchemeRegionBudgetId {

    @Column(name = "scheme_id", nullable = false)
    private UUID schemeId;

    @Column(name = "region_id", nullable = false)
    private Long regionId;

    public UUID getSchemeId() {
        return schemeId;
    }

    public Long getRegionId() {
        return regionId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof SchemeRegionBudgetId other)) return false;
        return Objects.equals(schemeId, other.schemeId) &&
               Objects.equals(regionId, other.regionId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(schemeId, regionId);
    }
}
