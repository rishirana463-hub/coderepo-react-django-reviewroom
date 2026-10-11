# AI interaction transcripts

The append-only external summary log is copied unchanged as `log.txt`. Six native Codex JSONL exports contain the complete root and delegated-agent session history available through the export cutoff **2026-10-11T08:12:46.557Z**. Parent/fork metadata establishes task ancestry; unrelated conversations are excluded. `manifest.json` records source basenames, thread IDs, byte sizes, SHA-256 hashes, and credential redaction counts.

The cutoff precedes the final commit/push verification and final chat response, which cannot be included recursively in their own export. Native exports are checked for actual backend signing secrets, saved GitHub credentials, and common credential patterns; any matches are replaced with `[REDACTED]`. Public fictional demo credentials remain for reproducibility. Session summaries are preserved without rewriting.

Transcripts stay in the private GitHub repository and are excluded from the HackerRank runtime archive by `.gitattributes`.
