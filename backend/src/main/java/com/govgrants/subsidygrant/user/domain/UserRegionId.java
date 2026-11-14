package com.govgrants.subsidygrant.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRegionId implements Serializable {

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "region_id")
    private Long regionId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserRegionId that = (UserRegionId) o;
        return Objects.equals(userId, that.userId) && Objects.equals(regionId, that.regionId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, regionId);
    }
}
