---
title: Limits
description: Every size limit, count, time limit and rate limit in NextPress, in one place.
order: 5
type: Reference
---

# Limits

These limits are fixed in the code of this version. Rate limits count per minute or per hour, and reset by themselves.

## Files

| What | Limit |
|---|---|
| One media upload | 10 MB |
| One SVG upload | 512 KB |
| Media file types | JPEG, PNG, GIF, WebP, SVG, MP4, WebM, MP3, WAV, PDF, plain text |
| Site logo and favicon | 5 MB each |
| One page file for import | 200 MB |
| A file inside a page file | 10 MB. Larger files become placeholders |
| Pictures copied with **Copy all blocks** | 2 MB each, 8 MB in total |

## Forms and comments

| What | Limit |
|---|---|
| Form sends | 5 a minute from one address |
| One form answer | 5,000 characters |
| Form name | 120 characters |
| Message after sending | 500 characters |
| Comments | 5 a minute from one address |
| One comment | 10,000 characters |
| Commenter name | 120 characters |

## Page assistant

| What | Limit |
|---|---|
| Requests running at once | 1 for each person |
| Requests | 30 an hour for each person |
| Steps in one request | 25 |
| Time for one request | 3 minutes |
| Blocks removed without asking | 10. More waits for your answer |
| Model name | 200 characters |
| Service address | 2,048 characters |
| Key | 1,024 characters |

## Keys, links and invites

| What | Limit |
|---|---|
| Active API keys | 25 for each person |
| API key life | 1 year at most |
| Preview link life | 1 hour at most. The SDK's default is 5 minutes, the MCP server's is 1 hour |
| People on one invite link | 1,000 at most, or no limit |
| Invite link note | 200 characters |

## Imports and lists

| What | Limit |
|---|---|
| WordPress items per import | 50 |
| WordPress site lookups | 10 a minute for each person |
| WordPress imports | 5 a minute for each person |
| Items in one list request through the API | 100 |
| Posts in the RSS feed | 1 to 100, set in **Settings** |

## Accounts

| What | Limit |
|---|---|
| Password | At least 8 characters |
| Setup wizard password | At least 8 characters, with an uppercase letter, a lowercase letter and a number |
| Username on an invite link | At least 2 characters |

## Server

| What | Limit |
|---|---|
| Free space for an upgrade | 1 GB in the install folder, 2 GB in Docker's data folder |
| Database backups kept | The three newest, before each upgrade adds one |
| Dashboard update logs kept | The ten newest |
| Wait for NextPress to answer after an upgrade | About 60 seconds |
| Upgrades running at once | 1 |

## Next steps

- [Troubleshooting](/docs/self-hosting/troubleshooting).
- [Media](/docs/building-pages/media).
- [Use the page assistant](/docs/ai/page-assistant).
