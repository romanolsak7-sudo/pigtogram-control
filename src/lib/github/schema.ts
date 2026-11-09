import { z } from "zod";

const text = z.string().max(1000);
const sha = z.string().regex(/^[a-f\d]{40,64}$/i);
const timestamp = z.string().datetime();
const id = z.number().int().positive();
const githubUrl = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "github.com" &&
      !url.username &&
      !url.password &&
      !url.port
    );
  });

// Upstream schemas strip everything except explicitly selected fields.
export const repoSchema = z.object({
  id,
  full_name: text,
  description: text.nullable(),
  language: text.nullable(),
  default_branch: text,
  html_url: githubUrl,
  private: z.boolean(),
});
export const pullSchema = z.object({
  id,
  number: id,
  title: text,
  draft: z.boolean(),
  state: z.literal("open"),
  html_url: githubUrl,
  updated_at: timestamp,
  head: z.object({ ref: text, sha }),
  base: z.object({ ref: text }),
});
export const runSchema = z.object({
  id,
  workflow_id: id,
  name: text.nullable(),
  run_attempt: id,
  head_sha: sha,
  head_branch: text.nullable(),
  event: text,
  status: text,
  conclusion: text.nullable(),
  html_url: githubUrl,
  updated_at: timestamp,
});
export const commitSchema = z.object({
  sha,
  html_url: githubUrl,
  commit: z.object({
    message: z.string().max(100000),
    committer: z.object({ date: timestamp }).nullable(),
  }),
});

export const repoDto = z
  .object({
    id,
    fullName: text,
    description: text.nullable(),
    language: text.nullable(),
    defaultBranch: text,
    url: githubUrl,
    private: z.boolean(),
  })
  .strict();
export const pullDto = z
  .object({
    id: z.string(),
    number: id,
    title: text,
    draft: z.boolean(),
    head: text,
    base: text,
    headSha: sha,
    updatedAt: timestamp,
    url: githubUrl,
  })
  .strict();
export const runDto = z
  .object({
    id,
    workflowId: id,
    name: text.nullable(),
    attempt: id,
    sha,
    branch: text.nullable(),
    event: text,
    status: text,
    conclusion: text.nullable(),
    updatedAt: timestamp,
    url: githubUrl,
  })
  .strict();
export const commitDto = z
  .object({
    sha,
    subject: text,
    committedAt: timestamp.nullable(),
    url: githubUrl,
  })
  .strict();
export const errorCode = z.enum([
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "RATE_LIMIT",
  "UPSTREAM",
  "TIMEOUT",
  "INVALID_RESPONSE",
  "UNAVAILABLE",
]);
const metadata = {
  source: z.enum(["fixture", "github"]),
  checkedAt: timestamp.nullable(),
  attemptedAt: timestamp,
  complete: z.boolean(),
  error: errorCode.nullable(),
  retryAt: timestamp.nullable(),
};

export function resourceSchema<T extends z.ZodType>(data: T) {
  return z.discriminatedUnion("state", [
    z
      .object({
        ...metadata,
        state: z.literal("fresh"),
        checkedAt: timestamp,
        data,
        error: z.null(),
      })
      .strict(),
    z
      .object({
        ...metadata,
        state: z.literal("stale"),
        checkedAt: timestamp,
        data,
        error: errorCode,
      })
      .strict(),
    z
      .object({
        ...metadata,
        state: z.literal("unavailable"),
        data: z.null(),
        error: errorCode,
      })
      .strict(),
  ]);
}

export const githubSnapshotSchema = z
  .object({
    mode: z.literal("github-fixture"),
    assembledAt: timestamp,
    scope: z.literal("romanolsak7-sudo/nasobilkozrouti"),
    repository: resourceSchema(repoDto),
    pulls: resourceSchema(z.array(pullDto).max(300)),
    workflows: resourceSchema(z.array(runDto).max(20)),
    commits: resourceSchema(z.array(commitDto).max(5)),
  })
  .strict();
export type GitHubSnapshot = z.infer<typeof githubSnapshotSchema>;
export type Resource<T> = {
  source: "fixture" | "github";
  checkedAt: string | null;
  attemptedAt: string;
  complete: boolean;
  error: z.infer<typeof errorCode> | null;
  retryAt: string | null;
} & (
  { state: "fresh" | "stale"; data: T } | { state: "unavailable"; data: null }
);

export function workflowLabel(run: z.infer<typeof runDto>): string {
  if (["queued", "waiting", "pending", "requested"].includes(run.status))
    return "Čeká";
  if (run.status === "in_progress") return "Probíhá";
  if (run.status !== "completed") return "Neznámý stav";
  return (
    (
      {
        success: "Běh úspěšný",
        failure: "Běh selhal",
        cancelled: "Zrušeno",
        skipped: "Přeskočeno",
        neutral: "Neutrální výsledek",
        timed_out: "Vypršel čas",
        action_required: "Vyžaduje zásah",
        stale: "Zastaralý běh",
      } as Record<string, string>
    )[run.conclusion ?? ""] ?? "Neznámý výsledek"
  );
}
