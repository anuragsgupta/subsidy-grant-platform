# Implementation Plan: REST API Backend

## Overview

Implement the service, controller, DTO, mapper, exception-handling, and documentation layers for the Government Subsidy & Grant Disbursement Tracking System. All entity classes, enums, and repositories already exist. The User and Role domain service/controller layers are also already implemented and are not modified here. This plan covers: (1) project-level setup, (2) the Scheme domain, (3) the Beneficiary domain, (4) the Application domain, (5) property-based tests, and (6) integration tests. Each step builds on the previous and wires into the running application.

## Tasks

- [x] 1. Project setup: add jqwik dependency and relocate CreateSchemeRequest
  - [x] 1.1 Add jqwik to pom.xml
    - Add `net.javacrumbs.jqwik:jqwik:1.9.1` to `<dependencies>` with `<scope>test</scope>` in `pom.xml`
    - Verify the dependency resolves with `mvn dependency:resolve -q`
    - _Requirements: 33, 34, 35_

  - [x] 1.2 Relocate CreateSchemeRequest to scheme.api package
    - Move `com.govgrants.subsidygrant.dto.request.CreateSchemeRequest` to `com.govgrants.subsidygrant.scheme.api.CreateSchemeRequest`
    - Update all import statements in any existing file that referenced the old package
    - Remove the now-empty `dto.request.CreateSchemeRequest` file
    - _Requirements: 10, 30_

- [x] 2. OpenAPI configuration
  - [x] 2.1 Create OpenApiConfig bean
    - Create `com.govgrants.subsidygrant.common.config.OpenApiConfig` with the `OpenAPI` bean as specified in the design
    - Configure API title, version, description, and Bearer JWT security scheme
    - _Requirements: 27_

- [x] 3. Scheme domain — DTOs and mapper
  - [x] 3.1 Create Scheme request and response DTOs
    - Create `UpdateSchemeRequest` in `scheme.api` with fields: `name`, `description`, `startDate`, `endDate`, `minGrantAmount`, `maxGrantAmount` and Jakarta Validation annotations as per design
    - Create `SchemeStatusRequest` in `scheme.api` with a `@NotNull SchemeStatus status` field
    - Create `SchemeResponse` in `scheme.api` with all fields including `id`, `code`, `status`, `createdAt`, `updatedAt`
    - Create `SchemeSummaryResponse` in `scheme.api` for paginated list results
    - _Requirements: 10.1, 10.2, 10.5, 10.6, 10.7, 11.1, 12.1, 13.1_

  - [x] 3.2 Create SchemeMapper
    - Create `com.govgrants.subsidygrant.scheme.mapper.SchemeMapper` as a MapStruct `@Mapper(componentModel = "spring")` interface
    - Declare `SchemeResponse toResponse(Scheme scheme)` and `SchemeSummaryResponse toSummaryResponse(Scheme scheme)`
    - _Requirements: 30.3_

- [x] 4. Scheme domain — service
  - [x] 4.1 Create SchemeService
    - Create `com.govgrants.subsidygrant.scheme.service.SchemeService` annotated `@Service @Transactional`
    - Use constructor injection for `SchemeRepository`, `ApplicationRepository`, and `SchemeMapper`
    - Implement `createScheme`: validate no duplicate code (throw `DuplicateResourceException`), validate `startDate <= endDate` (throw `BusinessRuleException("INVALID_DATE_RANGE", ...)`), validate `maxGrantAmount >= minGrantAmount > 0` (throw `BusinessRuleException("INVALID_AMOUNT_RANGE", ...)`), default status to `DRAFT` if null, persist and return `SchemeResponse`
    - Implement `listSchemes(Pageable)`: return `Page<SchemeSummaryResponse>` using mapper, `@Transactional(readOnly = true)`
    - Implement `getById(UUID)`: throw `ResourceNotFoundException` if not found
    - Implement `getByCode(String)`: throw `ResourceNotFoundException` if not found
    - Implement `updateScheme(UUID, UpdateSchemeRequest)`: re-validate date and amount ranges, code is immutable
    - Implement `updateStatus(UUID, SchemeStatus)`: load scheme, set status, return updated response
    - Implement `deleteScheme(UUID)`: throw `ResourceInUseException` if `applicationRepository.existsBySchemeId(id)` is true
    - _Requirements: 10.1–10.9, 11.1–11.5, 12.1–12.4, 13.1–13.3, 14.1–14.3_

  - [ ]* 4.2 Write unit tests for SchemeService
    - Create `SchemeServiceTest` using `@ExtendWith(MockitoExtension.class)`
    - Test all scenarios listed in the design's Testing Strategy for `SchemeServiceTest`
    - _Requirements: 33.2_

- [x] 5. Scheme domain — controller
  - [x] 5.1 Create SchemeController
    - Create `com.govgrants.subsidygrant.scheme.api.SchemeController` annotated `@RestController @RequestMapping("/api/v1/schemes")`
    - Use constructor injection for `SchemeService`
    - Implement all seven endpoints as per design: `POST /`, `GET /`, `GET /{id}`, `GET /code/{code}`, `PUT /{id}`, `PATCH /{id}/status`, `DELETE /{id}`
    - Add `@Tag`, `@Operation`, and `@ApiResponse` Springdoc annotations on each method
    - _Requirements: 10.1, 11.1–11.5, 12.1–12.4, 13.1–13.3, 14.1–14.3, 24, 26, 27_

  - [ ]* 5.2 Write MockMvc controller tests for SchemeController
    - Create `SchemeControllerTest` using `@WebMvcTest(SchemeController.class)`
    - Mock `SchemeService`; test all HTTP scenarios from the design's Controller Tests section
    - _Requirements: 34.1–34.6_

- [x] 6. Checkpoint — Scheme domain complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Beneficiary domain — DTOs and mapper
  - [x] 7.1 Create Beneficiary request and response DTOs
    - Create `CreateBeneficiaryRequest` in `beneficiary.api` with all fields and Jakarta Validation annotations as per design
    - Create `UpdateBeneficiaryRequest` in `beneficiary.api`
    - Create `BeneficiaryResponse` in `beneficiary.api` including `userId` (nullable)
    - Create `BeneficiarySummaryResponse` in `beneficiary.api` for paginated lists
    - _Requirements: 15.1, 15.2, 15.3, 15.6, 16.1, 17.1_

  - [x] 7.2 Create BeneficiaryMapper
    - Create `com.govgrants.subsidygrant.beneficiary.mapper.BeneficiaryMapper` as a MapStruct interface
    - Map `beneficiary.user.id` → `BeneficiaryResponse.userId` and `BeneficiarySummaryResponse.userId` using `@Mapping(target = "userId", source = "user.id")`
    - _Requirements: 30.3_

- [x] 8. Beneficiary domain — service
  - [x] 8.1 Create BeneficiaryService
    - Create `com.govgrants.subsidygrant.beneficiary.service.BeneficiaryService` annotated `@Service @Transactional`
    - Use constructor injection for `BeneficiaryRepository`, `AppUserRepository`, and `BeneficiaryMapper`
    - Implement `registerBeneficiary`: check duplicate `identityReference` (throw `DuplicateResourceException`), check `userId` already linked to another beneficiary (throw `DuplicateResourceException`), if `userId` non-null verify user exists via `AppUserRepository`, persist and return `BeneficiaryResponse`
    - Implement `listBeneficiaries(Pageable)`, `getById(UUID)`, `listByRegion(String, Pageable)`, `listByType(BeneficiaryType, Pageable)` — all `@Transactional(readOnly = true)`
    - Implement `updateBeneficiary(UUID, UpdateBeneficiaryRequest)`: check identity reference uniqueness against other records
    - Implement `deleteBeneficiary(UUID)`: throw `ResourceNotFoundException` if absent, then delete
    - _Requirements: 15.1–15.7, 16.1–16.5, 17.1–17.3, 18.1–18.2_

  - [ ]* 8.2 Write unit tests for BeneficiaryService
    - Create `BeneficiaryServiceTest` using `@ExtendWith(MockitoExtension.class)`
    - Test all scenarios listed in the design's Testing Strategy for `BeneficiaryServiceTest`
    - _Requirements: 33.3_

- [x] 9. Beneficiary domain — controller
  - [x] 9.1 Create BeneficiaryController
    - Create `com.govgrants.subsidygrant.beneficiary.api.BeneficiaryController` annotated `@RestController @RequestMapping("/api/v1/beneficiaries")`
    - Use constructor injection for `BeneficiaryService`
    - Implement all seven endpoints as per design: `POST /`, `GET /`, `GET /{id}`, `GET /region/{regionCode}`, `GET /type/{type}`, `PUT /{id}`, `DELETE /{id}`
    - Add `@Tag`, `@Operation`, and `@ApiResponse` Springdoc annotations
    - _Requirements: 15.1–15.7, 16.1–16.5, 17.1–17.3, 18.1–18.2, 24, 26, 27_

  - [ ]* 9.2 Write MockMvc controller tests for BeneficiaryController
    - Create `BeneficiaryControllerTest` using `@WebMvcTest(BeneficiaryController.class)`
    - Mock `BeneficiaryService`; test all HTTP scenarios from the design's Controller Tests section
    - _Requirements: 34.1–34.6_

- [x] 10. Checkpoint — Beneficiary domain complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Application domain — DTOs and mapper
  - [x] 11.1 Create Application request and response DTOs
    - Create `CreateApplicationRequest` in `application.api` with fields: `beneficiaryId`, `schemeId`, `referenceNo`, `requestedAmount`, `status` and Jakarta Validation annotations as per design
    - Create `UpdateApplicationRequest` in `application.api` with `requestedAmount`
    - Create `ApplicationStatusRequest` in `application.api` with `@NotNull ApplicationStatus status`
    - Create `ApplicationResponse` in `application.api` with all fields including flattened `beneficiaryFullName`, `schemeName`, `schemeCode`
    - Create `ApplicationSummaryResponse` in `application.api` for paginated lists
    - _Requirements: 19.1, 19.6, 19.8, 19.9, 20.1, 21.1, 22.1_

  - [x] 11.2 Create ApplicationMapper
    - Create `com.govgrants.subsidygrant.application.mapper.ApplicationMapper` as a MapStruct interface
    - Map nested fields: `beneficiary.id → beneficiaryId`, `beneficiary.fullName → beneficiaryFullName`, `scheme.id → schemeId`, `scheme.name → schemeName`, `scheme.code → schemeCode` using `@Mapping` for both `toResponse` and `toSummaryResponse`
    - _Requirements: 30.3, 30.4_

- [x] 12. Application domain — status transition validator
  - [x] 12.1 Create ApplicationStatusTransitionValidator
    - Create `com.govgrants.subsidygrant.application.service.ApplicationStatusTransitionValidator` annotated `@Component`
    - Define the static `ALLOWED_TRANSITIONS` map exactly as specified in the design, covering all 11 `ApplicationStatus` values
    - Implement `validate(ApplicationStatus current, ApplicationStatus next)`: throw `BusinessRuleException("INVALID_STATUS_TRANSITION", ...)` for invalid transitions
    - Implement `getAllowedTransitions(ApplicationStatus current)` returning the allowed set
    - _Requirements: 22.1–22.3, 22.5_

  - [ ]* 12.2 Write unit tests for ApplicationStatusTransitionValidator
    - Create `ApplicationStatusTransitionValidatorTest`
    - Test every allowed transition pair succeeds (no exception)
    - Test representative disallowed pairs throw `BusinessRuleException`
    - Test both terminal states (`COMPLETED`, `REJECTED`) reject all transitions
    - _Requirements: 33.4_

- [x] 13. Application domain — service
  - [x] 13.1 Create ApplicationService
    - Create `com.govgrants.subsidygrant.application.service.ApplicationService` annotated `@Service @Transactional`
    - Use constructor injection for `ApplicationRepository`, `BeneficiaryRepository`, `SchemeRepository`, `ApplicationStatusTransitionValidator`, and `ApplicationMapper`
    - Implement `createApplication`: verify beneficiary exists, verify scheme exists, enforce scheme status is `OPEN` (throw `BusinessRuleException("SCHEME_NOT_OPEN", ...)`), validate `requestedAmount` within `[scheme.minGrantAmount, scheme.maxGrantAmount]` (throw `BusinessRuleException("AMOUNT_OUT_OF_RANGE", ...)`), check duplicate `referenceNo` (throw `DuplicateResourceException`), default status to `DRAFT` if null, persist and return `ApplicationResponse`
    - Implement `listApplications(Pageable)`, `getById(UUID)`, `getByReferenceNo(String)`, `listByBeneficiary(UUID, Pageable)`, `listByScheme(UUID, Pageable)` — all `@Transactional(readOnly = true)`
    - Implement `updateApplication(UUID, UpdateApplicationRequest)`: reload scheme via application, re-validate amount range
    - Implement `updateStatus(UUID, ApplicationStatus)`: delegate to `transitionValidator.validate(current, target)`, then persist
    - Implement `deleteApplication(UUID)`: throw `ResourceNotFoundException` if absent, then delete
    - _Requirements: 19.1–19.9, 20.1–20.7, 21.1–21.3, 22.1–22.5_

  - [ ]* 13.2 Write unit tests for ApplicationService
    - Create `ApplicationServiceTest` using `@ExtendWith(MockitoExtension.class)`
    - Test all scenarios listed in the design's Testing Strategy for `ApplicationServiceTest`
    - _Requirements: 33.4_

- [x] 14. Application domain — controller
  - [x] 14.1 Create ApplicationController
    - Create `com.govgrants.subsidygrant.application.api.ApplicationController` annotated `@RestController @RequestMapping("/api/v1/applications")`
    - Use constructor injection for `ApplicationService`
    - Implement all nine endpoints as per design: `POST /`, `GET /`, `GET /{id}`, `GET /reference/{referenceNo}`, `GET /beneficiary/{beneficiaryId}`, `GET /scheme/{schemeId}`, `PUT /{id}`, `PATCH /{id}/status`, `DELETE /{id}`
    - Add `@Tag`, `@Operation`, and `@ApiResponse` Springdoc annotations
    - _Requirements: 19.1–19.9, 20.1–20.7, 21.1–21.3, 22.1–22.5, 24, 26, 27_

  - [ ]* 14.2 Write MockMvc controller tests for ApplicationController
    - Create `ApplicationControllerTest` using `@WebMvcTest(ApplicationController.class)`
    - Mock `ApplicationService`; test all HTTP scenarios from the design's Controller Tests section
    - _Requirements: 34.1–34.6_

- [x] 15. Checkpoint — Application domain complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Property-based tests
  - [ ]* 16.1 Write property test for Property 1 — Amount range invariant
    - Create `ApplicationAmountPropertyTest` using jqwik `@Property(tries = 200)`
    - Generate arbitrary `minGrantAmount` and positive `delta`; verify that for any `requestedAmount` outside `[min, min+delta]` the service throws, and inside the range it succeeds
    - Annotate: `// Feature: rest-api-backend, Property 1: requestedAmount ∈ [min, max] for all persisted applications`
    - **Property 1: Amount range invariant**
    - **Validates: Requirements 19.5, 19.6, 21.3**

  - [ ]* 16.2 Write property test for Property 2 — Status transition safety
    - Create `ApplicationStatusTransitionPropertyTest` using jqwik `@Property(tries = 500)`
    - Generate arbitrary `ApplicationStatus current` and `ApplicationStatus next` pairs; assert the validator accepts only edges in `ALLOWED_TRANSITIONS` and rejects all others
    - Annotate: `// Feature: rest-api-backend, Property 2: transitions always follow allowed graph edges`
    - **Property 2: Status transition safety**
    - **Validates: Requirements 22.1, 22.2, 22.3**

  - [ ]* 16.3 Write property test for Property 3 — Beneficiary identity reference uniqueness
    - Create `BeneficiaryUniquenessPropertyTest` using jqwik `@Property(tries = 100)`
    - Generate arbitrary non-blank strings of length 1–100; assert that creating a second beneficiary with the same `identityReference` always throws `DuplicateResourceException`
    - Annotate: `// Feature: rest-api-backend, Property 3: identity reference uniqueness enforced for all inputs`
    - **Property 3: Beneficiary identity reference uniqueness**
    - **Validates: Requirements 15.4, 17.3**

  - [ ]* 16.4 Write property test for Property 4 — Scheme code uniqueness
    - Create `SchemeCodeUniquenessPropertyTest` using jqwik `@Property(tries = 100)`
    - Generate arbitrary alpha strings of length 1–50; assert that creating a second scheme with the same `code` always throws `DuplicateResourceException`
    - Annotate: `// Feature: rest-api-backend, Property 4: scheme code uniqueness enforced for all inputs`
    - **Property 4: Scheme code uniqueness**
    - **Validates: Requirements 10.3**

  - [ ]* 16.5 Write property test for Property 5 — Application reference number uniqueness
    - Create `ApplicationReferenceUniquenessPropertyTest` using jqwik `@Property(tries = 100)`
    - Generate arbitrary strings of length 1–40; assert that creating a second application with the same `referenceNo` always throws `DuplicateResourceException`
    - Annotate: `// Feature: rest-api-backend, Property 5: referenceNo uniqueness enforced for all inputs`
    - **Property 5: Application reference number uniqueness**
    - **Validates: Requirements 19.7**

  - [ ]* 16.6 Write property test for Property 6 — Scheme amount ordering invariant
    - Create `SchemeAmountOrderingPropertyTest` using jqwik `@Property(tries = 200)`
    - Generate arbitrary positive `minGrantAmount` and `maxGrantAmount`; assert that when `max < min` the service throws `BusinessRuleException("INVALID_AMOUNT_RANGE", ...)`, and when `max >= min > 0` creation succeeds with the persisted scheme satisfying `max >= min > 0`
    - Annotate: `// Feature: rest-api-backend, Property 6: persisted schemes always have min > 0 and max >= min`
    - **Property 6: Scheme amount ordering invariant**
    - **Validates: Requirements 10.5, 10.6, 10.7, 12.3**

  - [ ]* 16.7 Write property test for Property 7 — Scheme is OPEN for application creation
    - Create `ApplicationSchemeOpenPropertyTest` using jqwik `@Property(tries = 100)`
    - Provide `@Provide Arbitrary<SchemeStatus> nonOpenStatuses()` returning `DRAFT`, `PAUSED`, `CLOSED`
    - For each non-OPEN status, assert that `createApplication` throws `BusinessRuleException("SCHEME_NOT_OPEN", ...)`
    - Annotate: `// Feature: rest-api-backend, Property 7: applications rejected for any non-OPEN scheme status`
    - **Property 7: Scheme is OPEN for application creation**
    - **Validates: Requirements 19.4**

- [ ] 17. Integration tests
  - [ ]* 17.1 Write repository integration tests
    - Create `SchemeRepositoryIT`, `BeneficiaryRepositoryIT`, and `ApplicationRepositoryIT` in the `it` package, using `BaseIT` and Testcontainers
    - Verify save/find round-trips, unique constraint violations, and custom query methods (`findByCode`, `findByIdentityReference`, `findByRegionCode`, `findByBeneficiaryType`, `findByReferenceNo`, `existsBySchemeId`)
    - _Requirements: 35.1–35.7_

  - [ ]* 17.2 Write service integration tests
    - Create `SchemeServiceIT` with the full Spring context and a real DB; exercise create → list → get → update → delete lifecycle and verify scheme deletion is blocked when an application exists
    - Create `ApplicationStatusTransitionIT`; exercise all allowed transitions from `DRAFT` to `COMPLETED` in sequence and verify terminal states reject all further transitions
    - _Requirements: 35.1–35.8_

- [x] 18. Final checkpoint — full test suite
  - Ensure all unit tests pass with `mvn test`, ask the user if questions arise.
  - For integration tests run `mvn verify -DskipJacocoCheck=false` (requires Docker); ensure JaCoCo 70% line-coverage gate passes for all `*.service` packages.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP. All core implementation tasks (without `*`) must be completed.
- Property-based tests (task 16) depend on the service implementations (tasks 4, 8, 12, 13) being complete. Run them after those tasks.
- Integration tests (task 17) require Docker for Testcontainers and are run via `mvn verify`, not `mvn test`.
- `CreateSchemeRequest` already exists at `dto.request`; task 1.2 relocates it. Any class in the existing codebase that imports it must have its import updated.
- The `GlobalExceptionHandler` is already complete; no new exception classes are needed — the new services throw the existing types in `common.exception`.
- jqwik integrates with JUnit 5 Platform natively; no additional runner configuration is needed beyond the dependency addition in task 1.1.
- All service classes must use `@Transactional` on the class and `@Transactional(readOnly = true)` on individual read methods.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1", "3.2"] },
    { "id": 2, "tasks": ["4.1", "7.1", "7.2", "11.1", "11.2", "12.1"] },
    { "id": 3, "tasks": ["4.2", "5.1", "8.1", "12.2", "13.1"] },
    { "id": 4, "tasks": ["5.2", "8.2", "9.1", "13.2", "14.1"] },
    { "id": 5, "tasks": ["9.2", "14.2", "16.1", "16.2", "16.3", "16.4", "16.5", "16.6", "16.7"] },
    { "id": 6, "tasks": ["17.1", "17.2"] }
  ]
}
```
