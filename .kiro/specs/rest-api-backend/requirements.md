# Requirements Document

## Introduction

This document specifies the requirements for a production-quality REST API backend for the Government Subsidy & Grant Disbursement Tracking System. The backend is a Java Spring Boot application backed by a PostgreSQL database (hosted on Supabase) whose schema was created in task DB-001. The database contains six tables: app_user, role, user_role, scheme, beneficiary, and application. All entity classes, enums, and repository interfaces already exist and are correctly mapped to the database schema. This feature adds the service, controller, DTO, validation, mapper, exception handling, configuration, and documentation layers needed to expose the database through versioned REST APIs.

The API covers five resource domains: User management, Role management, Scheme management, Beneficiary management, and Application management. Each domain exposes CRUD endpoints, filtering, pagination, and business-rule validation. The system enforces data integrity through bean validation, service-layer business rules, database constraints, and a centralized exception handler that produces a consistent JSON error format.

### Technology Conflicts and Recommendations

The following conflicts exist between the user's requested stack and the current project configuration:

1. **Spring Boot version**: The user requested Spring Boot 3.x, but the pom.xml already uses Spring Boot 4.1.2. Recommendation: keep the existing Spring Boot 4.1.2 version since the project is already configured with it, all dependencies resolve correctly, and downgrading would introduce unnecessary risk and breakage.

2. **Java version**: The user requested Java 21, but the pom.xml currently declares Java 17. Recommendation: upgrade to Java 21 as requested by updating `java.version` in pom.xml, since Java 21 is a supported LTS version and the upgrade is low-risk for this codebase.

3. **Hardcoded credentials**: The application.yml contains a visible Supabase database password. Recommendation: remove all hardcoded credentials from application.yml and source control, and read database connection parameters exclusively from environment variables with no default fallback for sensitive values.

## Glossary

- **Platform**: The Government Subsidy & Grant Disbursement Tracking System, a Spring Boot REST API backend.
- **User_API**: The REST API component handling endpoints under `/api/v1/users`.
- **Role_API**: The REST API component handling endpoints under `/api/v1/roles`.
- **Scheme_API**: The REST API component handling endpoints under `/api/v1/schemes`.
- **Beneficiary_API**: The REST API component handling endpoints under `/api/v1/beneficiaries`.
- **Application_API**: The REST API component handling endpoints under `/api/v1/applications`.
- **Validation_Service**: The layer performing Jakarta Bean Validation and service-layer business rule checks.
- **Exception_Handler**: The centralized `@RestControllerAdvice` component that catches and formats all errors.
- **Status_Transition_Validator**: The service-layer component that validates allowed Application status transitions.
- **OpenAPI_Docs**: The Springdoc OpenAPI documentation component generating Swagger UI.
- **User**: A record in the `app_user` table representing an application user profile.
- **Role**: A record in the `role` table representing one of five predefined system roles: BENEFICIARY, FIELD_OFFICER, DISTRICT_OFFICER, FINANCE_APPROVER, ADMIN.
- **UserRole**: A record in the `user_role` table mapping a User to a Role.
- **Scheme**: A record in the `scheme` table representing a government subsidy or grant scheme.
- **Beneficiary**: A record in the `beneficiary` table representing an applicant profile linked optionally to a User.
- **Application**: A record in the `application` table representing a grant application submitted by a Beneficiary for a Scheme.
- **Reference_Number**: The unique application identifier stored in `application.reference_no`.
- **Identity_Reference**: The unique beneficiary identifier stored in `beneficiary.identity_reference`.
- **Scheme_Status**: The status field of a Scheme with values DRAFT, OPEN, PAUSED, CLOSED.
- **Application_Status**: The status field of an Application with eleven values: DRAFT, SUBMITTED, UNDER_REVIEW, CLARIFICATION_REQUIRED, FIELD_VERIFIED, DISTRICT_APPROVED, FINANCE_APPROVED, REJECTED, DISBURSEMENT_IN_PROGRESS, COMPLETED, ON_HOLD.
- **Api_Response**: The standard JSON response wrapper containing success, message, data, errors, and timestamp fields.
- **Paged_Response**: A response containing content, currentPage, pageSize, totalElements, totalPages, and last metadata derived from a Spring Data Page.
- **Client_Supplied_Data**: Data provided by the API caller in a request body or path parameter.
- **System_Managed_Field**: A field that is controlled by the Platform, including UUID identifiers, created_at, updated_at, and assigned_at timestamps.

## Requirements

### Requirement 1: User Creation

**User Story:** As an administrator, I want to create user profiles, so that application users can be registered and assigned roles in the platform.

#### Acceptance Criteria

1. WHEN a valid CreateUserRequest is received, THE User_API SHALL create a User, persist the User to the app_user table, and return a 201 Created status with the created User data in an Api_Response.
2. WHEN a CreateUserRequest is received with a blank full name, THE User_API SHALL reject the request with a 400 Bad Request status and a descriptive error message.
3. WHEN a CreateUserRequest is received with an email that does not match a valid email format, THE User_API SHALL reject the request with a 400 Bad Request status and a descriptive error message.
4. WHEN a CreateUserRequest is received with a phone value that does not match a valid phone number format, THE User_API SHALL reject the request with a 400 Bad Request status and a descriptive error message.
5. WHEN a CreateUserRequest is received with an email that already exists in the app_user table, THE User_API SHALL reject the request with a 409 Conflict status and a descriptive error message.
6. THE User_API SHALL not accept system-managed fields including id, created_at, updated_at, and active from Client_Supplied_Data.
7. WHEN a User is created, THE User_API SHALL set active to true by default if no value is provided.

### Requirement 2: User Retrieval

**User Story:** As an administrator, I want to retrieve user profiles individually and in paginated lists, so that I can view and manage registered users.

#### Acceptance Criteria

1. WHEN a GET request is received with pagination parameters, THE User_API SHALL return a 200 OK status with a Paged_Response containing a page of Users sorted as specified.
2. WHEN a GET request is received with a valid User UUID path parameter, THE User_API SHALL return a 200 OK status with the corresponding User data in an Api_Response.
3. WHEN a GET request is received with a UUID that does not match any existing User, THE User_API SHALL return a 404 Not Found status with a descriptive error message.
4. THE User_API SHALL accept pagination parameters page, size, and sort with defaults of page 0 and size 10 when parameters are omitted.

### Requirement 3: User Update

**User Story:** As an administrator, I want to update user profile information, so that user records remain accurate and current.

#### Acceptance Criteria

1. WHEN a valid UpdateUserRequest is received with an existing User UUID, THE User_API SHALL update the User full name and phone fields, persist the changes, and return a 200 OK status with the updated User data.
2. WHEN an UpdateUserRequest is received with a blank full name, THE User_API SHALL reject the request with a 400 Bad Request status and a descriptive error message.
3. WHEN an UpdateUserRequest is received with a UUID that does not match any existing User, THE User_API SHALL return a 404 Not Found status with a descriptive error message.
4. THE User_API SHALL not allow the email field to be changed through the update endpoint.

### Requirement 4: User Activation and Deactivation

**User Story:** As an administrator, I want to activate or deactivate user accounts, so that I can control access to the platform without deleting user records.

#### Acceptance Criteria

1. WHEN a valid UserStatusRequest with active set to true is received for an existing User, THE User_API SHALL set the User active field to true, persist the change, and return a 200 OK status with the updated User data.
2. WHEN a valid UserStatusRequest with active set to false is received for an existing User, THE User_API SHALL set the User active field to false, persist the change, and return a 200 OK status with the updated User data.
3. WHEN a UserStatusRequest with a null active value is received, THE User_API SHALL reject the request with a 400 Bad Request status and a descriptive error message.
4. WHEN a UserStatusRequest is received with a UUID that does not match any existing User, THE User_API SHALL return a 404 Not Found status with a descriptive error message.

### Requirement 5: User Deletion

**User Story:** As an administrator, I want to delete user profiles where permitted, so that obsolete or erroneous user records can be removed.

#### Acceptance Criteria

1. WHEN a DELETE request is received with a valid User UUID, THE User_API SHALL delete the User, remove associated UserRole records, and return a 204 No Content status.
2. WHEN a DELETE request is received with a UUID that does not match any existing User, THE User_API SHALL return a 404 Not Found status with a descriptive error message.

### Requirement 6: User Role Assignment and Removal

**User Story:** As an administrator, I want to assign and remove roles for users, so that users can perform the actions associated with their assigned roles.

#### Acceptance Criteria

1. WHEN a POST request is received with a valid User UUID and a valid Role ID, THE User_API SHALL create a UserRole mapping, persist it to the user_role table, and return a 200 OK status with the updated User data including roles.
2. WHEN a role assignment is attempted with a UUID that does not match any existing User, THE User_API SHALL return a 404 Not Found status with a descriptive error message.
3. WHEN a role assignment is attempted with a Role ID that does not match any existing Role, THE User_API SHALL return a 404 Not Found status with a descriptive error message.
4. WHEN a role assignment is attempted for a UserRole mapping that already exists, THE User_API SHALL return a 409 Conflict status with a descriptive error message.
5. WHEN a GET request is received for roles of an existing User, THE User_API SHALL return a 200 OK status with the list of assigned Roles.
6. WHEN a DELETE request is received with a valid User UUID and a valid Role ID for an existing UserRole mapping, THE User_API SHALL remove the UserRole mapping and return a 204 No Content status.
7. WHEN a role removal is attempted for a UserRole mapping that does not exist, THE User_API SHALL return a 404 Not Found status with a descriptive error message.

### Requirement 7: Supabase Auth ID Protection

**User Story:** As a security-conscious administrator, I want to prevent arbitrary assignment of Supabase auth IDs, so that only trusted authentication flows can link user profiles to Supabase Auth accounts.

#### Acceptance Criteria

1. THE User_API SHALL not accept an auth_user_id from Client_Supplied_Data through the standard create or update endpoints.
2. WHEN the Platform introduces a trusted authentication linking flow, THE User_API SHALL set the auth_user_id only through that trusted flow and not through general user profile CRUD endpoints.

### Requirement 8: Role Retrieval

**User Story:** As an administrator, I want to retrieve role information, so that I can view the available system roles and assign them to users.

#### Acceptance Criteria

1. WHEN a GET request is received for all roles, THE Role_API SHALL return a 200 OK status with a list of all Roles in an Api_Response.
2. WHEN a GET request is received with a valid Role ID path parameter, THE Role_API SHALL return a 200 OK status with the corresponding Role data.
3. WHEN a GET request is received with a Role ID that does not match any existing Role, THE Role_API SHALL return a 404 Not Found status with a descriptive error message.
4. WHEN a GET request is received with a valid role name path parameter, THE Role_API SHALL return a 200 OK status with the corresponding Role data.
5. WHEN a GET request is received with a role name that does not match any existing Role, THE Role_API SHALL return a 404 Not Found status with a descriptive error message.

### Requirement 9: Role Management Protection

**User Story:** As a platform maintainer, I want roles to be predefined system data, so that the five system roles remain stable and cannot be altered through the API.

#### Acceptance Criteria

1. THE Role_API SHALL not expose an endpoint to create new Roles.
2. THE Role_API SHALL not expose an endpoint to delete existing Roles.
3. THE Role_API SHALL not expose an endpoint to update existing Roles.

### Requirement 10: Scheme Creation

**User Story:** As an administrator, I want to create government subsidy and grant schemes, so that beneficiaries can apply for available schemes.

#### Acceptance Criteria

1. WHEN a valid CreateSchemeRequest is received, THE Scheme_API SHALL create a Scheme, persist it to the scheme table, and return a 201 Created status with the created Scheme data in an Api_Response.
2. WHEN a CreateSchemeRequest is received with a blank scheme code, THE Scheme_API SHALL reject the request with a 400 Bad Request status and a descriptive error message.
3. WHEN a CreateSchemeRequest is received with a code that already exists in the scheme table, THE Scheme_API SHALL reject the request with a 409 Conflict status and a descriptive error message.
4. WHEN a CreateSchemeRequest is received where the start date is after the end date, THE Scheme_API SHALL reject the request with a 400 Bad Request status and a descriptive error message.
5. WHEN a CreateSchemeRequest is received where the maximum grant amount is less than the minimum grant amount, THE Scheme_API SHALL reject the request with a 400 Bad Request status and a descriptive error message.
6. WHEN a CreateSchemeRequest is received with a minimum grant amount less than or equal to zero, THE Scheme_API SHALL reject the request with a 400 Bad Request status and a descriptive error message.
7. WHEN a CreateSchemeRequest is received with a maximum grant amount less than or equal to zero, THE Scheme_API SHALL reject the request with a 400 Bad Request status and a descriptive error message.
8. WHEN a CreateSchemeRequest is received without a status value, THE Scheme_API SHALL set the Scheme status to DRAFT by default.
9. THE Scheme_API SHALL not accept system-managed fields including id, created_at, and updated_at from Client_Supplied_Data.

### Requirement 11: Scheme Retrieval

**User Story:** As an administrator, I want to retrieve scheme information individually, in paginated lists, and by code, so that I can review and manage available schemes.

#### Acceptance Criteria

1. WHEN a GET request is received with pagination parameters, THE Scheme_API SHALL return a 200 OK status with a Paged_Response containing a page of Schemes.
2. WHEN a GET request is received with a valid Scheme UUID path parameter, THE Scheme_API SHALL return a 200 OK status with the corresponding Scheme data.
3. WHEN a GET request is received with a UUID that does not match any existing Scheme, THE Scheme_API SHALL return a 404 Not Found status with a descriptive error message.
4. WHEN a GET request is received with a valid scheme code path parameter, THE Scheme_API SHALL return a 200 OK status with the corresponding Scheme data.
5. WHEN a GET request is received with a scheme code that does not match any existing Scheme, THE Scheme_API SHALL return a 404 Not Found status with a descriptive error message.

### Requirement 12: Scheme Update

**User Story:** As an administrator, I want to update scheme details, so that scheme information remains accurate and current.

#### Acceptance Criteria

1. WHEN a valid update request is received with an existing Scheme UUID, THE Scheme_API SHALL update the Scheme fields, persist the changes, and return a 200 OK status with the updated Scheme data.
2. WHEN an update request is received where the start date is after the end date, THE Scheme_API SHALL reject the request with a 400 Bad Request status and a descriptive error message.
3. WHEN an update request is received where the maximum grant amount is less than the minimum grant amount, THE Scheme_API SHALL reject the request with a 400 Bad Request status and a descriptive error message.
4. WHEN an update request is received with a UUID that does not match any existing Scheme, THE Scheme_API SHALL return a 404 Not Found status with a descriptive error message.

### Requirement 13: Scheme Status Management

**User Story:** As an administrator, I want to change the status of a scheme, so that I can control when schemes are open, paused, or closed for applications.

#### Acceptance Criteria

1. WHEN a valid status update request is received for an existing Scheme, THE Scheme_API SHALL update the Scheme_Status, persist the change, and return a 200 OK status with the updated Scheme data.
2. WHEN a status update request is received with a UUID that does not match any existing Scheme, THE Scheme_API SHALL return a 404 Not Found status with a descriptive error message.
3. WHEN a status update request is received with an invalid Scheme_Status value, THE Scheme_API SHALL reject the request with a 400 Bad Request status and a descriptive error message.

### Requirement 14: Scheme Deletion Protection

**User Story:** As an administrator, I want to prevent deletion of schemes that have existing applications, so that application data integrity is preserved.

#### Acceptance Criteria

1. WHEN a DELETE request is received for a Scheme that has no associated Applications, THE Scheme_API SHALL delete the Scheme and return a 204 No Content status.
2. WHEN a DELETE request is received for a Scheme that has one or more associated Applications, THE Scheme_API SHALL reject the request with a 409 Conflict status and a descriptive error message.
3. WHEN a DELETE request is received with a UUID that does not match any existing Scheme, THE Scheme_API SHALL return a 404 Not Found status with a descriptive error message.

### Requirement 15: Beneficiary Registration

**User Story:** As an administrator or applicant, I want to register beneficiaries, so that applicant profiles can be created for submitting grant applications.

#### Acceptance Criteria

1. WHEN a valid beneficiary registration request is received, THE Beneficiary_API SHALL create a Beneficiary, persist it to the beneficiary table, and return a 201 Created status with the created Beneficiary data in an Api_Response.
2. WHEN a registration request is received with a blank full name, THE Beneficiary_API SHALL reject the request with a 400 Bad Request status and a descriptive error message.
3. WHEN a registration request is received with an invalid BeneficiaryType value, THE Beneficiary_API SHALL reject the request with a 400 Bad Request status and a descriptive error message.
4. WHEN a registration request is received with an identity_reference that already exists in the beneficiary table, THE Beneficiary_API SHALL reject the request with a 409 Conflict status and a descriptive error message.
5. WHEN a registration request is received with a user_id that is already linked to another Beneficiary, THE Beneficiary_API SHALL reject the request with a 409 Conflict status and a descriptive error message.
6. WHEN a registration request is received with a blank identity_reference, THE Beneficiary_API SHALL reject the request with a 400 Bad Request status and a descriptive error message.
7. THE Beneficiary_API SHALL not accept system-managed fields including id, created_at, and updated_at from Client_Supplied_Data.

### Requirement 16: Beneficiary Retrieval and Filtering

**User Story:** As an administrator, I want to retrieve beneficiaries individually, in paginated lists, and filtered by region or type, so that I can review and manage applicant profiles.

#### Acceptance Criteria

1. WHEN a GET request is received with pagination parameters, THE Beneficiary_API SHALL return a 200 OK status with a Paged_Response containing a page of Beneficiaries.
2. WHEN a GET request is received with a valid Beneficiary UUID path parameter, THE Beneficiary_API SHALL return a 200 OK status with the corresponding Beneficiary data.
3. WHEN a GET request is received with a UUID that does not match any existing Beneficiary, THE Beneficiary_API SHALL return a 404 Not Found status with a descriptive error message.
4. WHEN a GET request is received with a valid region_code path parameter and pagination parameters, THE Beneficiary_API SHALL return a 200 OK status with a Paged_Response containing Beneficiaries filtered by that region_code.
5. WHEN a GET request is received with a valid BeneficiaryType path parameter and pagination parameters, THE Beneficiary_API SHALL return a 200 OK status with a Paged_Response containing Beneficiaries filtered by that BeneficiaryType.

### Requirement 17: Beneficiary Update

**User Story:** As an administrator, I want to update beneficiary profile information, so that applicant records remain accurate and current.

#### Acceptance Criteria

1. WHEN a valid update request is received with an existing Beneficiary UUID, THE Beneficiary_API SHALL update the Beneficiary fields, persist the changes, and return a 200 OK status with the updated Beneficiary data.
2. WHEN an update request is received with a UUID that does not match any existing Beneficiary, THE Beneficiary_API SHALL return a 404 Not Found status with a descriptive error message.
3. WHEN an update request is received with an identity_reference that already belongs to a different Beneficiary, THE Beneficiary_API SHALL reject the request with a 409 Conflict status and a descriptive error message.

### Requirement 18: Beneficiary Deletion

**User Story:** As an administrator, I want to delete beneficiary profiles where permitted, so that obsolete or erroneous records can be removed.

#### Acceptance Criteria

1. WHEN a DELETE request is received with a valid Beneficiary UUID, THE Beneficiary_API SHALL delete the Beneficiary and return a 204 No Content status.
2. WHEN a DELETE request is received with a UUID that does not match any existing Beneficiary, THE Beneficiary_API SHALL return a 404 Not Found status with a descriptive error message.

### Requirement 19: Application Creation

**User Story:** As a beneficiary, I want to submit grant applications for open schemes, so that I can request funding from available government subsidies and grants.

#### Acceptance Criteria

1. WHEN a valid application creation request is received, THE Application_API SHALL create an Application, persist it to the application table, and return a 201 Created status with the created Application data in an Api_Response.
2. WHEN an application creation request is received with a beneficiary_id that does not match any existing Beneficiary, THE Application_API SHALL reject the request with a 404 Not Found status and a descriptive error message.
3. WHEN an application creation request is received with a scheme_id that does not match any existing Scheme, THE Application_API SHALL reject the request with a 404 Not Found status and a descriptive error message.
4. WHEN an application creation request is received for a Scheme whose Scheme_Status is not OPEN, THE Application_API SHALL reject the request with a 400 Bad Request status and a descriptive error message.
5. WHEN an application creation request is received with a requested_amount that is less than the Scheme minimum grant amount or greater than the Scheme maximum grant amount, THE Application_API SHALL reject the request with a 400 Bad Request status and a descriptive error message.
6. WHEN an application creation request is received with a requested_amount that is less than or equal to zero, THE Application_API SHALL reject the request with a 400 Bad Request status and a descriptive error message.
7. WHEN an application creation request is received with a reference_no that already exists in the application table, THE Application_API SHALL reject the request with a 409 Conflict status and a descriptive error message.
8. WHEN an Application is created, THE Application_API SHALL set the Application_Status to DRAFT by default if no status value is provided.
9. THE Application_API SHALL not accept system-managed fields including id, created_at, updated_at, and submitted_at from Client_Supplied_Data.

### Requirement 20: Application Retrieval and Lookups

**User Story:** As an administrator or officer, I want to retrieve applications individually and filtered by beneficiary or scheme, so that I can review and process grant applications.

#### Acceptance Criteria

1. WHEN a GET request is received with pagination parameters, THE Application_API SHALL return a 200 OK status with a Paged_Response containing a page of Applications.
2. WHEN a GET request is received with a valid Application UUID path parameter, THE Application_API SHALL return a 200 OK status with the corresponding Application data.
3. WHEN a GET request is received with a UUID that does not match any existing Application, THE Application_API SHALL return a 404 Not Found status with a descriptive error message.
4. WHEN a GET request is received with a valid reference_no path parameter, THE Application_API SHALL return a 200 OK status with the corresponding Application data.
5. WHEN a GET request is received with a reference_no that does not match any existing Application, THE Application_API SHALL return a 404 Not Found status with a descriptive error message.
6. WHEN a GET request is received with a valid beneficiary_id path parameter and pagination parameters, THE Application_API SHALL return a 200 OK status with a Paged_Response containing Applications for that Beneficiary.
7. WHEN a GET request is received with a valid scheme_id path parameter and pagination parameters, THE Application_API SHALL return a 200 OK status with a Paged_Response containing Applications for that Scheme.

### Requirement 21: Application Update

**User Story:** As an administrator or officer, I want to update application details, so that application records remain accurate during processing.

#### Acceptance Criteria

1. WHEN a valid update request is received with an existing Application UUID, THE Application_API SHALL update the Application fields, persist the changes, and return a 200 OK status with the updated Application data.
2. WHEN an update request is received with a UUID that does not match any existing Application, THE Application_API SHALL return a 404 Not Found status with a descriptive error message.
3. WHEN an update request is received with a requested_amount outside the Scheme grant amount range, THE Application_API SHALL reject the request with a 400 Bad Request status and a descriptive error message.

### Requirement 22: Application Status Transitions

**User Story:** As an administrator or officer, I want to update application status through allowed transitions, so that applications move through the review and approval workflow in a controlled manner.

#### Acceptance Criteria

1. WHEN a valid status update request is received for an existing Application, THE Status_Transition_Validator SHALL validate that the requested Application_Status transition is allowed before persisting the change.
2. WHEN a status transition request specifies a transition that is not allowed by the centralized transition rules, THE Application_API SHALL reject the request with a 400 Bad Request status with a descriptive error message indicating the invalid transition.
3. THE Status_Transition_Validator SHALL centralize all allowed Application_Status transition rules in a single location for extensibility.
4. WHEN a status update request is received with a UUID that does not match any existing Application, THE Application_API SHALL return a 404 Not Found status with a descriptive error message.
5. WHEN a status update request is received with an invalid Application_Status value, THE Application_API SHALL reject the request with a 400 Bad Request status and a descriptive error message.

### Requirement 23: Request Validation

**User Story:** As an API consumer, I want requests to be validated consistently, so that invalid data is rejected with clear error messages before reaching the database.

#### Acceptance Criteria

1. WHEN any request body fails Jakarta Bean Validation, THE Validation_Service SHALL reject the request with a 400 Bad Request status and a list of descriptive field-level error messages.
2. THE Validation_Service SHALL use BigDecimal for all monetary values and SHALL not use float or double types for monetary fields.
3. THE Validation_Service SHALL use the UUID type for all UUID identifiers and the Long type for BIGINT identifiers.
4. WHEN a request body cannot be parsed as valid JSON, THE Validation_Service SHALL reject the request with a 400 Bad Request status and a descriptive error message.

### Requirement 24: Response Format

**User Story:** As an API consumer, I want all responses to follow a consistent JSON structure, so that I can parse and handle responses uniformly across all endpoints.

#### Acceptance Criteria

1. WHEN any endpoint succeeds with data, THE Platform SHALL return an Api_Response with success set to true, a message, the data payload, and an ISO-8601 timestamp.
2. WHEN any endpoint fails, THE Platform SHALL return an Api_Response with success set to false, a message, an errors list, and an ISO-8601 timestamp.
3. THE Platform SHALL use HTTP status codes 200 for successful retrieval and updates, 201 for successful creation, 204 for successful deletion, 400 for validation errors, 404 for resource-not-found, 409 for conflicts, and 500 for internal server errors.
4. THE Platform SHALL not expose stack traces, SQL queries, or sensitive internal details in error responses.

### Requirement 25: Centralized Error Handling

**User Story:** As a platform maintainer, I want all exceptions handled centrally, so that error responses are consistent and no unhandled exceptions leak implementation details.

#### Acceptance Criteria

1. WHEN a resource is not found, THE Exception_Handler SHALL catch the exception and return a 404 Not Found status with an Api_Response containing a descriptive error message.
2. WHEN a constraint violation or validation error occurs, THE Exception_Handler SHALL catch the exception and return a 400 Bad Request status with an Api_Response containing field-level error messages.
3. WHEN a data integrity violation such as a duplicate unique value occurs, THE Exception_Handler SHALL catch the exception and return a 409 Conflict status with an Api_Response containing a descriptive error message.
4. WHEN an unexpected exception occurs, THE Exception_Handler SHALL catch the exception, log the details server-side, and return a 500 Internal Server Error status with a generic error message that does not expose internal details.
5. WHEN a method argument type mismatch occurs such as an invalid UUID in a path parameter, THE Exception_Handler SHALL catch the exception and return a 400 Bad Request status with a descriptive error message.

### Requirement 26: Pagination Support

**User Story:** As an API consumer, I want to paginate list results, so that I can retrieve manageable subsets of large data collections.

#### Acceptance Criteria

1. WHEN a list endpoint receives page, size, and sort parameters, THE Platform SHALL use Spring Data Pageable to retrieve the corresponding page of results.
2. THE Platform SHALL apply default values of page 0 and size 10 when pagination parameters are omitted.
3. WHEN a list endpoint returns results, THE Platform SHALL return a Paged_Response containing content, currentPage, pageSize, totalElements, totalPages, and last fields.

### Requirement 27: API Documentation

**User Story:** As an API consumer, I want interactive API documentation, so that I can discover available endpoints, parameters, request bodies, response schemas, and status codes.

#### Acceptance Criteria

1. THE OpenAPI_Docs SHALL generate OpenAPI 3 documentation for all REST API endpoints using Springdoc OpenAPI.
2. THE OpenAPI_Docs SHALL expose a Swagger UI interface at `/swagger-ui/index.html`.
3. THE OpenAPI_Docs SHALL document each endpoint with its HTTP method, path, request body schema, response schema, status codes, and examples.
4. THE OpenAPI_Docs SHALL document pagination parameters and the Paged_Response schema.

### Requirement 28: Credential Security

**User Story:** As a security-conscious platform maintainer, I want all database credentials managed through environment variables, so that no secrets are stored in source code or version control.

#### Acceptance Criteria

1. THE Platform SHALL read all database connection parameters including URL, username, and password exclusively from environment variables.
2. THE Platform SHALL not include a default fallback value for the database password in application.yml or any committed configuration file.
3. THE Platform SHALL keep Supabase Auth integration separate from user profile CRUD operations.

### Requirement 29: Dependency Injection

**User Story:** As a platform maintainer, I want all components to use constructor injection, so that dependencies are explicit, testable, and immutable.

#### Acceptance Criteria

1. THE Platform SHALL use constructor injection for all service, controller, and configuration components.
2. THE Platform SHALL not use field injection for any dependency.

### Requirement 30: Data Transfer Object Separation

**User Story:** As an API consumer, I want request and response data structures separated from database entities, so that the API contract is stable and independent of the database schema and circular JSON serialization is prevented.

#### Acceptance Criteria

1. THE Platform SHALL use separate request DTOs for all request bodies and SHALL not accept JPA entities directly as request bodies.
2. THE Platform SHALL use separate response DTOs for all response payloads and SHALL not return JPA entities directly in API responses.
3. THE Platform SHALL use mapper components to convert between JPA entities and DTOs.
4. THE Platform SHALL prevent circular JSON serialization caused by bidirectional entity relationships by using DTOs that contain only the required fields.

### Requirement 31: Database Configuration

**User Story:** As a platform maintainer, I want the database configuration to validate the schema without modifying it, so that the existing Supabase schema is protected from accidental Hibernate-generated changes.

#### Acceptance Criteria

1. THE Platform SHALL set Hibernate ddl-auto to validate to ensure schema alignment without modifying the existing database tables.
2. THE Platform SHALL not use ddl-auto settings of create, create-drop, or update.
3. WHEN a schema mismatch is detected between entity mappings and the database, THE Platform SHALL fail fast at startup with a descriptive error message.
4. THE Platform SHALL use appropriate fetch strategies including lazy loading for associations to avoid eager loading of related entities.

### Requirement 32: Transaction Management

**User Story:** As a platform maintainer, I want multi-write operations to be transactional, so that partial failures roll back and data integrity is preserved.

#### Acceptance Criteria

1. WHEN a service method performs multiple write operations, THE Platform SHALL annotate the method with @Transactional to ensure atomicity.
2. WHEN a transactional operation fails midway, THE Platform SHALL roll back all changes made within that transaction.

### Requirement 33: Unit Testing

**User Story:** As a developer, I want comprehensive unit tests for the service layer, so that business logic is verified in isolation from external dependencies.

#### Acceptance Criteria

1. WHEN unit tests are written for UserService, THE Platform SHALL test user creation, duplicate email rejection, find by ID, user update, activate and deactivate, and role assignment and removal.
2. WHEN unit tests are written for SchemeService, THE Platform SHALL test valid scheme creation, duplicate code rejection, invalid date range rejection, invalid amount range rejection, scheme update, and rejection of deletion when applications exist.
3. WHEN unit tests are written for BeneficiaryService, THE Platform SHALL test registration, duplicate identity reference rejection, duplicate linked user rejection, find by ID, and filtering by region and type.
4. WHEN unit tests are written for ApplicationService, THE Platform SHALL test valid application creation, nonexistent beneficiary rejection, nonexistent scheme rejection, closed or paused scheme rejection, amount outside limits rejection, duplicate reference rejection, application update, invalid status transition rejection, and find by beneficiary and scheme.

### Requirement 34: Controller Testing

**User Story:** As a developer, I want controller-level tests with MockMvc, so that HTTP request handling, response structure, and status codes are verified.

#### Acceptance Criteria

1. WHEN controller tests are written, THE Platform SHALL test successful POST and GET operations for each resource.
2. WHEN controller tests are written, THE Platform SHALL test that an invalid request body returns a 400 Bad Request status.
3. WHEN controller tests are written, THE Platform SHALL test that a request for a missing resource returns a 404 Not Found status.
4. WHEN controller tests are written, THE Platform SHALL test that a duplicate resource creation returns a 409 Conflict status.
5. WHEN controller tests are written, THE Platform SHALL verify that the JSON response structure matches the Api_Response and Paged_Response formats.
6. WHEN controller tests are written, THE Platform SHALL test that pagination parameters produce correctly paginated results.

### Requirement 35: Integration Testing

**User Story:** As a developer, I want integration tests against a real PostgreSQL database using Testcontainers, so that entity mappings, repository operations, and database constraints are verified end to end.

#### Acceptance Criteria

1. WHEN integration tests are written, THE Platform SHALL use Testcontainers with a real PostgreSQL instance.
2. WHEN integration tests are written, THE Platform SHALL verify entity-to-table mappings for all six database tables.
3. WHEN integration tests are written, THE Platform SHALL verify repository query operations including custom query methods.
4. WHEN integration tests are written, THE Platform SHALL verify foreign key constraints on user_role, beneficiary, and application relationships.
5. WHEN integration tests are written, THE Platform SHALL verify unique constraints on email, scheme code, reference_no, and identity_reference.
6. WHEN integration tests are written, THE Platform SHALL verify the user-role many-to-many relationship.
7. WHEN integration tests are written, THE Platform SHALL verify the beneficiary-application and scheme-application relationships.
8. WHEN integration tests are written, THE Platform SHALL verify that a multi-step transactional operation rolls back on failure.
