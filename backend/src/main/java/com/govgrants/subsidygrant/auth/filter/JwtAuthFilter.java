package com.govgrants.subsidygrant.auth.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.govgrants.subsidygrant.auth.repository.AppUserRepository;
import com.govgrants.subsidygrant.auth.service.JwtService;
import com.govgrants.subsidygrant.auth.service.UserStatusCache;
import com.govgrants.subsidygrant.common.domain.ActorContext;
import com.govgrants.subsidygrant.common.response.ApiResponse;
import com.govgrants.subsidygrant.user.repository.UserRegionRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * Extracts and validates the Bearer JWT on every protected request (AC-AUTH-03.1..03.3).
 * <p>
 * On success, populates the {@link SecurityContextHolder} with the user id as principal
 * and sets an {@link ActorContext} request attribute for downstream services.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String ACTOR_CONTEXT_ATTR = "actorContext";
    private static final String MDC_KEY = "correlationId";

    private static final List<String> SKIP_PATHS = List.of(
            "/api/v1/auth/register",
            "/api/v1/auth/login",
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/actuator/health"
    );

    private final JwtService jwtService;
    private final AppUserRepository userRepository;
    private final UserStatusCache userStatusCache;
    private final UserRegionRepository userRegionRepository;
    private final ObjectMapper objectMapper;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public JwtAuthFilter(
            JwtService jwtService,
            AppUserRepository userRepository,
            UserStatusCache userStatusCache,
            UserRegionRepository userRegionRepository,
            ObjectMapper objectMapper
    ) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.userStatusCache = userStatusCache;
        this.userRegionRepository = userRegionRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            String token = extractToken(request);
            if (token == null) {
                filterChain.doFilter(request, response);
                return;
            }

            if (!jwtService.isTokenValid(token)) {
                writeError(response, 401, "UNAUTHENTICATED", "Invalid or expired token");
                return;
            }

            UUID userId = jwtService.extractUserId(token);
            if (userId == null) {
                writeError(response, 401, "UNAUTHENTICATED", "Invalid or expired token");
                return;
            }

            if (!userStatusCache.isActive(userId)) {
                writeError(response, 401, "UNAUTHENTICATED", "Account is inactive or deleted");
                return;
            }

            String role = jwtService.extractRole(token);
            List<Long> regionIds = userRegionRepository.findRegionIdsByUserId(userId);

            String authority = role != null ? "ROLE_" + role : null;
            List<SimpleGrantedAuthority> authorities = authority != null
                    ? List.of(new SimpleGrantedAuthority(authority))
                    : List.of();

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userId, token, authorities);
            SecurityContextHolder.getContext().setAuthentication(authentication);

            String correlationId = MDC.get(MDC_KEY);
            String ipAddress = request.getRemoteAddr();
            ActorContext actorContext = new ActorContext(userId, role, regionIds, correlationId, ipAddress);
            request.setAttribute(ACTOR_CONTEXT_ATTR, actorContext);

            filterChain.doFilter(request, response);
        } catch (JwtException e) {
            writeError(response, 401, "UNAUTHENTICATED", "Invalid or expired token");
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return SKIP_PATHS.stream().anyMatch(pattern -> pathMatcher.match(pattern, path));
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length());
        }
        return null;
    }

    private void writeError(
            HttpServletResponse response,
            int status,
            String errorCode,
            String message
    ) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        String correlationId = MDC.get(MDC_KEY);
        ApiResponse<Void> body = ApiResponse.<Void>error(errorCode, message).withCorrelationId(correlationId);
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
