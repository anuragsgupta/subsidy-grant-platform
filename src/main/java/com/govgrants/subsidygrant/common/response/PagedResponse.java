package com.govgrants.subsidygrant.common.response;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Standard paginated response envelope (§11.1, D-09: default 20, max 100).
 *
 * NFR-03
 */
public record PagedResponse<T>(
        List<T> content,
        int currentPage,
        int pageSize,
        long totalElements,
        int totalPages,
        boolean last
) {

    public static <T> PagedResponse<T> from(Page<T> page) {
        return new PagedResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isLast()
        );
    }
}
