import { z } from 'zod';

// Define the schema for the authentication token
// We use .passthrough() to allow standard JWT claims (iat, exp, jti, sub) 
// and any other fields NextAuth might add, while strictly validating our critical custom claims.
export const tokenSchema = z.object({
  // Critical identity fields
  id: z.union([z.string(), z.number()], {
    required_error: "Token is missing 'id'",
    invalid_type_error: "Token 'id' must be a string or number"
  }),
  role: z.string({
    required_error: "Token is missing 'role'",
    invalid_type_error: "Token 'role' must be a string"
  }).min(1, "Token 'role' cannot be empty"),
  
  // Critical security fields
  tokenVersion: z.number({
    required_error: "Token is missing 'tokenVersion'",
    invalid_type_error: "Token 'tokenVersion' must be a number"
  }).nonnegative().default(0),

  // Session concurrency control (server-side validated)
  sessionId: z.string().min(8).optional().nullable(),

  // Context fields (optional but typed if present)
  email: z.string().email().optional().nullable(),
  name: z.string().optional().nullable(),
  picture: z.string().optional().nullable(),
  
  // Role-specific fields
  hospitalId: z.union([z.number(), z.string()]).optional().nullable(),
  doctorHospitalIds: z.array(z.number()).optional().nullable(),
  staffRoleName: z.string().optional().nullable(),
  isStaff: z.boolean().optional(),
  permissionKeys: z.array(z.string()).optional(),
  isAdmin: z.boolean().optional(),
  superAdminRole: z.string().optional(),
  mustChangePassword: z.boolean().optional(),
}).passthrough();

export type ValidToken = z.infer<typeof tokenSchema>;

/**
 * Validates the structure of an authentication token.
 * Returns the validated token if successful, or null if validation fails.
 * Logs validation errors to the console.
 */
export function validateTokenStructure(token: any): ValidToken | null {
  if (!token) return null;

  const result = tokenSchema.safeParse(token);

  if (!result.success) {
    console.error('[TokenValidation] Invalid token structure:', result.error.format());
    return null;
  }

  return result.data;
}

/**
 * Throws an error if the token is invalid.
 * Useful for contexts where you want to interrupt execution immediately.
 */
export function assertTokenValid(token: any): ValidToken {
  const validToken = validateTokenStructure(token);
  if (!validToken) {
    throw new Error('Invalid authentication token structure');
  }
  return validToken;
}
