/** Mirrors RoleResponse.java — read-only role lookup record. */
export interface RoleResponse {
  id: number;
  name: string;
  description: string | null;
  createdAt: string; // ISO-8601 instant
}
