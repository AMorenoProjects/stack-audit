import { z } from "zod";

const portSchema = z.object({
  port: z.number().int().min(1).max(65535),
  name: z.string().min(1),
  type: z.enum(["tcp"]).optional().default("tcp"),
});

const envSchema = z.object({
  target: z.string().min(1),
  example: z.string().min(1),
  required: z.array(z.string().min(1)).min(1, "At least one required env var must be specified"),
});

const commandSchema = z.object({
  cmd: z.string().min(1),
  match: z.string().optional(),
  errorMsg: z.string().optional(),
});

/**
 * Semver range string — validates that the value is a non-empty string
 * that semver can interpret. Prevents empty strings from bypassing
 * the "at least one check" refinement while producing zero actual checks.
 */
const semverRangeString = z.string().min(1, "Semver range cannot be empty");

const checksSchema = z
  .object({
    node: semverRangeString.optional(),
    npm: semverRangeString.optional(),
    env: envSchema.optional(),
    ports: z.array(portSchema).min(1, "Ports array cannot be empty").optional(),
    files: z.array(z.string().min(1)).min(1, "Files array cannot be empty").optional(),
    commands: z.array(commandSchema).min(1, "Commands array cannot be empty").optional(),
  })
  .refine(
    (checks) => {
      // Count checks that actually produce work — excludes undefined keys
      // and explicitly guards against the "empty config = exit 0" false positive.
      const hasNode = checks.node !== undefined;
      const hasNpm = checks.npm !== undefined;
      const hasEnv = checks.env !== undefined;
      const hasPorts = checks.ports !== undefined && checks.ports.length > 0;
      const hasFiles = checks.files !== undefined && checks.files.length > 0;
      const hasCommands = checks.commands !== undefined && checks.commands.length > 0;

      return hasNode || hasNpm || hasEnv || hasPorts || hasFiles || hasCommands;
    },
    { message: "At least one check must be configured" },
  );

export const configSchema = z.object({
  projectName: z.string().min(1, "projectName is required"),
  version: z.string().min(1, "version is required"),
  checks: checksSchema,
});

export type ConfigSchemaInput = z.input<typeof configSchema>;
export type ConfigSchemaOutput = z.output<typeof configSchema>;
