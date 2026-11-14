package com.govgrants.subsidygrant.auth.api;

import com.govgrants.subsidygrant.auth.service.AuthService;
import com.govgrants.subsidygrant.common.domain.ActorContext;
import com.govgrants.subsidygrant.common.response.ApiResponse;
import com.govgrants.subsidygrant.user.api.UserResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Authentication endpoints: beneficiary self-registration, login, and current-user
 * lookup (REQ-AUTH-01, REQ-AUTH-02, REQ-AUTH-03.4).
 *
 * <p>Controllers contain no business logic — they validate, call one service method,
 * and wrap the result in the standard {@link ApiResponse} envelope.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final String ACTOR_CONTEXT_ATTR = "actorContext";

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Beneficiary self sign-up (AC-AUTH-01.1).
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse user = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("User registered successfully", user));
    }

    /**
     * Login (AC-AUTH-02.1).
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<TokenResponse>> login(@Valid @RequestBody LoginRequest request) {
        TokenResponse token = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", token));
    }

    /**
     * Current user profile (AC-AUTH-03.4).
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> me(HttpServletRequest request) {
        ActorContext actor = (ActorContext) request.getAttribute(ACTOR_CONTEXT_ATTR);
        UserResponse user = authService.getCurrentUser(actor);
        return ResponseEntity.ok(ApiResponse.success("Current user", user));
    }
}
