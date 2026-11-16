package com.govgrants.subsidygrant.user.service;

import com.govgrants.subsidygrant.audit.service.AuditService;
import com.govgrants.subsidygrant.common.domain.ActorContext;
import com.govgrants.subsidygrant.common.exception.BusinessRuleException;
import com.govgrants.subsidygrant.user.api.CreateRegionRequest;
import com.govgrants.subsidygrant.user.api.RegionResponse;
import com.govgrants.subsidygrant.user.domain.Region;
import com.govgrants.subsidygrant.user.domain.RegionType;
import com.govgrants.subsidygrant.user.repository.RegionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for RegionService (createRegion) and RegionQueryServiceImpl (isDescendantOf).
 * REQ-USR-03, D-18 / AC-USR-03.1, AC-USR-03.2
 */
@ExtendWith(MockitoExtension.class)
class RegionServiceTest {

    @Mock RegionRepository regionRepository;
    @Mock AuditService auditService;

    @InjectMocks
    RegionService regionService;

    // A second service under test for isDescendantOf
    // (constructed manually with the same mock regionRepository)
    RegionQueryServiceImpl regionQueryService;

    private ActorContext adminActor() {
        return new ActorContext(UUID.randomUUID(), "ADMIN", List.of(), null, null);
    }

    private Region stateRegion(Long id, String code) {
        return Region.builder()
                .id(id)
                .code(code)
                .name("State " + code)
                .type(RegionType.STATE)
                .parentId(null)
                .build();
    }

    private Region districtRegion(Long id, String code, Long parentId) {
        return Region.builder()
                .id(id)
                .code(code)
                .name("District " + code)
                .type(RegionType.DISTRICT)
                .parentId(parentId)
                .build();
    }

    // -------------------------------------------------------------------------
    // RegionService — createRegion
    // -------------------------------------------------------------------------

    @Test
    void createsStateRegionSuccessfully() {
        when(regionRepository.existsByCode("TN")).thenReturn(false);
        Region saved = stateRegion(1L, "TN");
        when(regionRepository.save(any(Region.class))).thenReturn(saved);

        CreateRegionRequest request = new CreateRegionRequest("TN", "Tamil Nadu", RegionType.STATE, null);

        RegionResponse response = regionService.createRegion(request, adminActor());

        assertThat(response).isNotNull();
        assertThat(response.code()).isEqualTo("TN");
        assertThat(response.type()).isEqualTo(RegionType.STATE);
        verify(regionRepository).save(any(Region.class));
    }

    @Test
    void throwsWhenDistrictCreatedWithoutParent() {
        when(regionRepository.existsByCode("DIST01")).thenReturn(false);

        CreateRegionRequest request = new CreateRegionRequest("DIST01", "District 01", RegionType.DISTRICT, null);

        assertThatThrownBy(() -> regionService.createRegion(request, adminActor()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("parent STATE");
    }

    @Test
    void throwsWhenDistrictCreatedWithDistrictParent() {
        when(regionRepository.existsByCode("DIST02")).thenReturn(false);
        // Parent is a DISTRICT — invalid
        Region districtParent = districtRegion(10L, "PARENTDIST", null);
        when(regionRepository.findById(10L)).thenReturn(Optional.of(districtParent));

        CreateRegionRequest request = new CreateRegionRequest("DIST02", "District 02", RegionType.DISTRICT, 10L);

        assertThatThrownBy(() -> regionService.createRegion(request, adminActor()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("STATE");
    }

    // -------------------------------------------------------------------------
    // RegionQueryServiceImpl — isDescendantOf
    // -------------------------------------------------------------------------

    private RegionQueryServiceImpl buildQueryService() {
        return new RegionQueryServiceImpl(regionRepository);
    }

    @Test
    void isDescendantOf_returnsTrueForSelf() {
        // isDescendantOf delegates to findDescendantIds(ancestorId), which includes self
        when(regionRepository.findDescendantIds(1L)).thenReturn(List.of(1L));

        RegionQueryServiceImpl svc = buildQueryService();
        assertThat(svc.isDescendantOf(1L, 1L)).isTrue();
    }

    @Test
    void isDescendantOf_returnsTrueForDirectChild() {
        // State 1 has district 2 as a child
        when(regionRepository.findDescendantIds(1L)).thenReturn(List.of(1L, 2L));

        RegionQueryServiceImpl svc = buildQueryService();
        assertThat(svc.isDescendantOf(2L, 1L)).isTrue();
    }

    @Test
    void isDescendantOf_returnsFalseForUnrelated() {
        // Region 3 is not a descendant of region 1
        when(regionRepository.findDescendantIds(1L)).thenReturn(List.of(1L, 2L));

        RegionQueryServiceImpl svc = buildQueryService();
        assertThat(svc.isDescendantOf(3L, 1L)).isFalse();
    }
}
