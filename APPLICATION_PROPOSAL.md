# Reviewroom: content review and approval

Status: participant authorized building Reviewroom and explicitly skipped the Discord approval requirement on 2026-10-11.

## Purpose

Reviewroom helps content teams and their reviewers bring campaign copy and visual assets from draft to approval. Feedback and approvals are tied to exact versions, so changing content cannot silently preserve an obsolete approval. The main workflow is: create a project, prepare an asset version, assign a review sequence, collect feedback, request changes or approve, and export the approved version with its review history.

## Users and scope

Workspace owners configure access and review policies. Editors prepare content and revisions. Reviewers leave feedback and make review decisions. All roles have reachable, role-appropriate workflows within one browser session; assessment users can sign out and sign in as seeded users to verify authorization.

Eight integrated capabilities:

1. **Workspace identity and access:** authenticated sessions, owner/editor/reviewer roles, and server-enforced access to projects and decisions.
2. **Project and asset version management:** create and organize projects, edit copy, select bundled local visual assets, create immutable submitted versions, and compare revision history. Server-side uploads and external media services are outside scope.
3. **Version-specific feedback:** anchor comments to text selections or image coordinates, reply to threads, resolve feedback, and retain prior-version discussions with clear stale-anchor handling.
4. **Staged approval workflows:** ordered review stages, required reviewers and quorum, explicit change requests, valid state transitions, and automatic invalidation of decisions when a new version is submitted.
5. **Reviewer assignments and deadlines:** assign reviewers, reject incompatible assignments, track overdue reviews, and surface in-product reminders through deterministic, idempotent processing.
6. **Search and saved views:** server-side filtering, sorting, bounded pagination, and saved views for awaiting-review, changes-requested, overdue, and approved content, with authorization applied to every query.
7. **Activity history and inbox:** append-only audit events for meaningful actions, an in-product notification inbox, and read/unread status linked to real project and review actions.
8. **Reporting and exports:** approval-cycle metrics and reviewer workload derived from persisted events, with filtered CSV exports and approved-content manifests that require no external publishing service.

## Engineering depth and assessment suitability

The core correctness boundaries are version-bound approvals, concurrent reviewer decisions, authorization, idempotent reminders, stale feedback, and accurate dashboard aggregates. These offer realistic troubleshooting surfaces across UI state, API validation, service logic, and persistence without shipping intentional defects in the baseline.

Use optimistic concurrency for version and workflow updates, unique indexes for duplicate-decision protection, bounded queries and domain indexes, consistent API errors, and polling for in-product updates. Every capability must have real React interactions, Django routes, service logic, and MongoDB-backed data, including loading, empty, permission, validation, success, and error states.

## Stack and delivery

Preserve the calendar reference's React/Vite frontend, Django/DRF backend, MongoEngine/MongoDB persistence, native browser HTTP client, Bun workspace and lockfile, and existing dependency surface. Match its feature folders, setup flow, deterministic seed/reset behavior, debugger configuration, and HackerRank ports. Exact pinned versions are recorded in `PROGRESS.md`; any upgrades must be validated rather than assumed to work.

After approval, implement the complete application and then complete the six requested production-polish phases in order. Measure the baseline bundle before performance changes, verify every page at 360px, 768px, and 1280px, run lint/build before each phase commit, and finish with the provided validation skill. Keep the submission private, export AI transcripts, and use only local media.

## Discord proposal

> Proposed application: **Reviewroom — content review and approval**. Content teams can create projects, prepare versioned copy and visual assets, collect anchored feedback, and move exact versions through staged reviewer approvals. The eight capabilities are workspace roles, version management, feedback threads, staged approvals, reviewer assignments/deadlines, search/saved views, audit history/in-product inbox, and reporting/exports. React + Django + MongoDB will follow the reference structure and pinned dependency baseline. Engineering depth includes version-bound approvals, optimistic concurrency, idempotent reminders, authorization, indexed pagination, and event-derived analytics. Core workflows use local data and media and require no external services. Please confirm whether this idea is sufficiently distinct from existing submissions and approved to build.
