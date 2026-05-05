# API Reference – Robotics C IDE Backend

Base URL: `http://localhost:3000`

## Health Check

```
GET /api/health
```

Response:
```json
{ "status": "ok", "version": "1.0.0", "timestamp": "..." }
```

---

## Block Definitions

```
GET /api/blocks
```

Returns the array of block definitions. Frontend uses built-in definitions if this returns 204.

---

## Projects

### List all projects
```
GET /api/projects
```

### Create project
```
POST /api/projects
Content-Type: application/json

{
  "name": "My Project",
  "description": "Optional",
  "blocks": [ /* block instances */ ]
}
```

### Get project
```
GET /api/projects/:id
```

### Update project
```
PUT /api/projects/:id
Content-Type: application/json

{ "name": "Updated Name", "blocks": [...] }
```

### Delete project
```
DELETE /api/projects/:id
```

---

## Compile

```
POST /api/compile
Content-Type: application/json

{ "code": "#include <stdio.h>\nint main(){...}" }
```

Response:
```json
{
  "success": true,
  "output": "Compilation successful! No warnings."
}
```

Requires `gcc` to be installed on the server.
