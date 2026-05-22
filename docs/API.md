# API Reference

Base URL: `http://your-vps-ip:3000`  
All endpoints return `Content-Type: application/json`.

These are the **external API** endpoints called by your applications. They do not require `ADMIN_TOKEN` - they use their own auth mechanism below.

## Authentication

Two separate auth mechanisms:

| Header | Used on | Value |
|---|---|---|
| `X-API-Key` | `POST /api/sessions` | Project API key - `ds_catalog_K8mXq2…` |
| `X-Session-Token` | All search/ingest routes | Session token - `sess_Yz9…` |

## Endpoints

---

### POST /api/sessions

Creates a session for a project. Body is empty - the API key is sufficient.

**Request**
```http
POST /api/sessions
X-API-Key: ds_catalog_K8mXq2TzNpLw9aYrB3
```

**Response 200**
```json
{
  "token": "sess_Yz9mXqTz",
  "projectId": "clx1a2b3c",
  "projectName": "Product Catalog",
  "expiresAt": "2026-05-21T10:00:00.000Z"
}
```

**Errors**
| Status | Reason |
|---|---|
| 401 | Missing or invalid API key |
| 403 | Project is inactive |

---

### DELETE /api/sessions/:token

Explicitly invalidates a session (logout).

**Request**
```http
DELETE /api/sessions/sess_Yz9mXqTz
X-Session-Token: sess_Yz9mXqTz
```

**Response 200**
```json
{ "ok": true }
```

---

### GET /api/search

Runs a semantic search against the project's configured table.

**Request**
```http
GET /api/search?q=wireless+headphones&limit=10&threshold=0.65
X-Session-Token: sess_Yz9mXqTz
```

**Query parameters**

| Param | Type | Default | Description |
|---|---|---|---|
| `q` | string | required | Search query |
| `limit` | integer | 10 | Max results to return |
| `threshold` | float | 0.65 | Min cosine similarity score (0–1) |

**Response 200**
```json
{
  "query": "wireless headphones",
  "results": [
    {
      "id": 42,
      "score": 0.91,
      "data": { "product_name": "Bluetooth Earbuds Pro", "category": "Electronics" }
    },
    {
      "id": 87,
      "score": 0.84,
      "data": { "product_name": "Wireless Over-Ear Headset", "category": "Electronics" }
    }
  ],
  "totalResults": 2,
  "latencyMs": 112
}
```

The `data` object contains all non-vector columns from the matched row.

**Errors**
| Status | Reason |
|---|---|
| 400 | Missing `q` parameter |
| 401 | Missing or invalid session token |
| 503 | Ollama is unreachable |

---

### POST /api/ingest

Triggers embedding generation for all un-embedded rows in the project's table. Safe to call multiple times - skips rows that already have an embedding.

**Request**
```http
POST /api/ingest
X-Session-Token: sess_Yz9mXqTz
```

**Response 200**
```json
{
  "embedded": 12,
  "skipped": 1488,
  "failed": 0,
  "durationMs": 8200
}
```

Ingest runs synchronously and may take several minutes for large tables. For the initial 1,500-row ingest, expect ~2 minutes.

**Errors**
| Status | Reason |
|---|---|
| 401 | Missing or invalid session token |
| 409 | Ingest already running for this project |
| 503 | Ollama is unreachable |

---

## Error response shape

All errors return:
```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE"
}
```

## Rate limiting

Default: 100 requests per minute per API key. Configurable via `RATE_LIMIT_MAX` env var.  
Returns `429 Too Many Requests` when exceeded.

## Health check

```http
GET /api/health
```
```json
{
  "status": "ok",
  "ollama": "reachable",
  "db": "connected",
  "uptime": 3600
}
```
