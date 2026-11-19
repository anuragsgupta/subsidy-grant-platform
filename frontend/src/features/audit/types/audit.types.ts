/** Mirrors ActorType.java. */
export type ActorType = 'USER' | 'SYSTEM' | 'API_CLIENT';

/** Mirrors AuditLogResponse.java. `oldValue`/`newValue` are arbitrary JSON. */
export interface AuditLogResponse {
  id: number;
  occurredAt: string; // ISO-8601 instant
  actorId: string | null; // UUID
  actorRole: string | null;
  actorType: ActorType;
  action: string;
  entityType: string;
  entityId: string;
  referenceNo: string | null;
  oldValue: unknown;
  newValue: unknown;
  remark: string | null;
  correlationId: string | null;
  ipAddress: string | null;
}

/** Query params for GET /audit (AU1). */
export interface AuditQueryParams {
  referenceNo?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  from?: string; // ISO-8601 instant
  to?: string; // ISO-8601 instant
  page?: number;
  size?: number;
}
