package com.govgrants.subsidygrant.application.service;

import com.govgrants.subsidygrant.common.exception.BusinessRuleException;
import com.govgrants.subsidygrant.enums.ApplicationStatus;
import org.springframework.stereotype.Component;
import java.util.Map;
import java.util.Set;

@Component
public class ApplicationStatusTransitionValidator {

    private static final Map<ApplicationStatus, Set<ApplicationStatus>> ALLOWED_TRANSITIONS =
        Map.ofEntries(
            Map.entry(ApplicationStatus.DRAFT,
                Set.of(ApplicationStatus.SUBMITTED)),
            Map.entry(ApplicationStatus.SUBMITTED,
                Set.of(ApplicationStatus.UNDER_REVIEW, ApplicationStatus.ON_HOLD,
                       ApplicationStatus.REJECTED)),
            Map.entry(ApplicationStatus.UNDER_REVIEW,
                Set.of(ApplicationStatus.CLARIFICATION_REQUIRED, ApplicationStatus.FIELD_VERIFIED,
                       ApplicationStatus.ON_HOLD, ApplicationStatus.REJECTED)),
            Map.entry(ApplicationStatus.CLARIFICATION_REQUIRED,
                Set.of(ApplicationStatus.UNDER_REVIEW, ApplicationStatus.REJECTED)),
            Map.entry(ApplicationStatus.FIELD_VERIFIED,
                Set.of(ApplicationStatus.DISTRICT_APPROVED, ApplicationStatus.REJECTED)),
            Map.entry(ApplicationStatus.DISTRICT_APPROVED,
                Set.of(ApplicationStatus.FINANCE_APPROVED, ApplicationStatus.REJECTED)),
            Map.entry(ApplicationStatus.FINANCE_APPROVED,
                Set.of(ApplicationStatus.DISBURSEMENT_IN_PROGRESS, ApplicationStatus.REJECTED)),
            Map.entry(ApplicationStatus.DISBURSEMENT_IN_PROGRESS,
                Set.of(ApplicationStatus.COMPLETED)),
            Map.entry(ApplicationStatus.ON_HOLD,
                Set.of(ApplicationStatus.UNDER_REVIEW, ApplicationStatus.REJECTED)),
            Map.entry(ApplicationStatus.COMPLETED, Set.of()),
            Map.entry(ApplicationStatus.REJECTED, Set.of())
        );

    public void validate(ApplicationStatus current, ApplicationStatus next) {
        Set<ApplicationStatus> allowed = ALLOWED_TRANSITIONS.getOrDefault(current, Set.of());
        if (!allowed.contains(next)) {
            throw new BusinessRuleException("INVALID_STATUS_TRANSITION",
                "Transition from " + current + " to " + next + " is not allowed");
        }
    }

    public Set<ApplicationStatus> getAllowedTransitions(ApplicationStatus current) {
        return ALLOWED_TRANSITIONS.getOrDefault(current, Set.of());
    }
}
