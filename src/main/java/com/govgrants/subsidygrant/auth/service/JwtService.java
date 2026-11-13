package com.govgrants.subsidygrant.auth.service;

import com.govgrants.subsidygrant.auth.domain.AppUser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.UUID;

/**
 * Self-issued JWT service for HS256 token generation and validation (D-03, AC-AUTH-02.1).
 * <p>
 * Tokens carry the user's id as {@code sub}, a single-element {@code roles} claim,
 * plus standard {@code iat} and {@code exp} claims.
 *
 * REQ-AUTH-02, REQ-AUTH-03
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    private final SecretKey key;
    private final long expirationMinutes;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-minutes:30}") long expirationMinutes
    ) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMinutes = expirationMinutes;
    }

    /**
     * Generates a signed JWT for the given user (AC-AUTH-02.1).
     *
     * @param user the authenticated AppUser (roles loaded via userRoles association)
     * @return compact JWT string
     */
    public String generateToken(AppUser user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMinutes * 60_000L);

        List<String> roles = user.getUserRoles() == null || user.getUserRoles().isEmpty()
                ? List.of()
                : user.getUserRoles().stream()
                        .map(ur -> ur.getRole().getName())
                        .toList();

        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("roles", roles)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    /**
     * Extracts the user id (sub claim) from the token.
     *
     * @return the UUID, or {@code null} if the token is invalid or the subject is not a valid UUID.
     */
    public UUID extractUserId(String token) {
        try {
            Claims claims = parseClaims(token);
            return UUID.fromString(claims.getSubject());
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * Extracts the first role from the {@code roles} claim.
     *
     * @return the role name, or {@code null} if the token is invalid or the claim is empty.
     */
    public String extractRole(String token) {
        try {
            Claims claims = parseClaims(token);
            List<?> roles = claims.get("roles", List.class);
            if (roles == null || roles.isEmpty()) {
                return null;
            }
            return String.valueOf(roles.get(0));
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * Validates the token's signature and expiry (AC-AUTH-03.1).
     *
     * @return {@code true} if the token parses and the signature is valid.
     */
    public boolean isTokenValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /**
     * Checks whether the token has expired.
     *
     * @return {@code true} if expired or unparseable, {@code false} otherwise.
     */
    public boolean isTokenExpired(String token) {
        try {
            Claims claims = parseClaims(token);
            return claims.getExpiration().before(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            return true;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
