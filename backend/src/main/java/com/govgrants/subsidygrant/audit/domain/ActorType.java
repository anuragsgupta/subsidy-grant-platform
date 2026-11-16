package com.govgrants.subsidygrant.audit.domain;

/**
 * Identifies the type of actor that performed an audited action.
 *
 * REQ-AUD-01, AC-AUD-01.4
 */
public enum ActorType {
    USER,
    SYSTEM,
    API_CLIENT
}
