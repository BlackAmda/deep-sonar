# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✅ |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report privately via email: [create a GitHub private security advisory](../../security/advisories/new)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

Expected response: acknowledgement within 48 hours, status update within 7 days.

If accepted: patch released ASAP, credit given in release notes.  
If declined: explanation provided.

## Scope

In scope:
- Authentication bypass (middleware, session validation)
- AES-256-GCM encryption weaknesses (DB config storage)
- SQL injection via project config fields
- Session token forgery or HMAC bypass
- API key exposure through any endpoint
- Rate limit bypass

Out of scope:
- Vulnerabilities in self-hosted infrastructure (your MySQL, your VPS)
- Denial of service against Ollama (local process)
- Issues requiring physical access to the server
