import "server-only";
import type { Transport } from "./client";
import { PILOT_REPOSITORY, validatedUrl } from "./client";

const sha = "a".repeat(40);
const at = "2026-11-09T00:00:00.000Z";
// Synthetic contract fixtures. No network, filesystem secrets or production values.
export const fixtureTransport: Transport = async (request) => {
  const url = validatedUrl(request.url);
  if (request.method !== "GET") throw new Error("READ_ONLY");
  const html = `https://github.com/${PILOT_REPOSITORY}`;
  if (url.pathname.endsWith("/pulls"))
    return Response.json([
      {
        id: 1001,
        number: 1001,
        title: "UKÁZKA — bezpečný pohyb hada",
        draft: true,
        state: "open",
        html_url: `${html}/pull/1001`,
        updated_at: at,
        head: { ref: "fixture/safe-snake", sha },
        base: { ref: "main" },
      },
    ]);
  if (url.pathname.endsWith("/actions/runs"))
    return Response.json({
      total_count: 1,
      workflow_runs: [
        {
          id: 1001,
          workflow_id: 100,
          name: "UKÁZKA — kontrola sestavení",
          run_attempt: 1,
          head_sha: sha,
          head_branch: "fixture/safe-snake",
          event: "pull_request",
          status: "completed",
          conclusion: "success",
          html_url: `${html}/actions/runs/1001`,
          updated_at: at,
        },
      ],
    });
  if (url.pathname.endsWith("/commits"))
    return Response.json([
      {
        sha,
        html_url: `${html}/commit/${sha}`,
        commit: {
          message: "UKÁZKA — první kontrolovaný snímek",
          committer: { date: at },
        },
      },
    ]);
  return Response.json({
    id: 100,
    full_name: PILOT_REPOSITORY,
    description: "Simulovaný repozitář pro ověření datového modelu",
    language: "TypeScript",
    default_branch: "main",
    html_url: html,
    private: false,
  });
};
