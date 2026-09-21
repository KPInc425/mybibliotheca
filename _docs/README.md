# BookOracle documentation

Index of what actually exists. This file previously listed twelve documents
(API reference, database schema, user manual, security, performance, and so on)
that were never written; the links are now removed rather than left pointing at
nothing.

## Start here

- **[../CURRENT_STATUS.md](../CURRENT_STATUS.md)** - what is deployed, what works,
  and the honest caveats. If you read one thing, read this.

## Core

- [Architecture Overview](./architecture.md) - system structure and data flow
- [Project Overview](./project-overview.md) - what the app is and who it is for
- [History](./history/) - historical migration and feature reports. **Point-in-time
  only**; do not treat them as current documentation.

## Operational

- [Deployment](../DEPLOYMENT.md)
- [Database migration](../MIGRATION.md)
- [Migration system internals](../MIGRATION_SYSTEM.md)
- [Testing](../TESTING.md)

## Subsystem reference

- [Authentication](../AUTHENTICATION.md)
- [Admin tools](../ADMIN_TOOLS.md)

## API

There is no hand-written API reference. The app serves a live OpenAPI spec, which
is the only version worth trusting:

- Running locally: `http://localhost:5054/api-docs`
- Spec: `http://localhost:5054/api/openapi.json`

In production the API is not reachable directly (containers bind to loopback), so
generate the spec from a local instance.

## About

BookOracle is a self-hosted personal library and reading tracker, an alternative
to Goodreads, StoryGraph, and Fable. It exists as a fork of MyBibliotheca, which
is why older files in this repo still carry that name.

## License

MIT. See [../LICENSE](../LICENSE).
