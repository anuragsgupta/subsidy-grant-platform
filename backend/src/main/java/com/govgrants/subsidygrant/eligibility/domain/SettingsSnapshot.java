package com.govgrants.subsidygrant.eligibility.domain;

import java.math.BigDecimal;

/**
 * Immutable snapshot of system settings used by the pure-function RiskTierPolicy (BR-RISK-1).
 *
 * <p>Thresholds are sourced from {@code SettingsCacheService} at evaluation time and passed
 * into the evaluator so the policy remains I/O-free.
 *
 * <p>Default values (from §5.4 of requirements):
 * <ul>
 *   <li>risk.low.minScore = 75</li>
 *   <li>risk.low.maxAmount = 50000.00</li>
 *   <li>risk.medium.minScore = 50</li>
 *   <li>risk.medium.maxAmount = 200000.00</li>
 * </ul>
 *
 * <p>Requirements: REQ-ELG-04, BR-RISK-1, BR-RISK-2
 */
public record SettingsSnapshot(
        int lowMinScore,
        BigDecimal lowMaxAmount,
        int mediumMinScore,
        BigDecimal mediumMaxAmount) {}
