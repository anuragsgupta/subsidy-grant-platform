package com.govgrants.subsidygrant.dto.response;

import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {

    private UUID id;
    private UUID authUserId;
    private String fullName;
    private String email;
    private String phone;
    private Boolean active;
    private Instant createdAt;
    private Instant updatedAt;
    @Builder.Default
    private List<RoleResponse> roles = new ArrayList<>();
}
