---
name: Generated OpenAPI client typings
description: TypeScript library configuration needed by the generated Fetch client.
---

The API client TypeScript configuration needs `dom.iterable` alongside `dom` and the ECMAScript library. Orval emits `Headers.entries()` in generated Fetch code; without the iterable DOM types, code generation succeeds but the chained library typecheck fails.

**Why:** The generated client uses iterable `Headers` APIs that are not declared by the base DOM library alone.

**How to apply:** Preserve `dom.iterable` when changing the API client TypeScript configuration or replacing its generated Fetch setup.