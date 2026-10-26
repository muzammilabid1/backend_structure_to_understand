# Developer Documentation for AI Agents

This monorepo comprises code and documentation for the Learning with Parents platform.

## Documentation Structure

Developer and agent-facing documentation lives in the [`docs/`](docs/) directory as markdown files.

Package-specific documentation lives in the `docs/` subdirectory of the package.

### Current Documentation

-   [Infrastructure > CloudWatch > Alarms](docs/infrastructure/cloudwatch/index.md) - CloudWatch alarm configurations, response procedures, and known issues
-   [Frontend > Page inventory](docs/frontend/page-inventory.md) - how a frontend page decides who can open it, the `pageTitle` every page must set, and how the list of pages a page announcement can target is made
-   [Notifications > Inactive school teacher emails](docs/notifications/inactive-school-teacher-emails.md) - which teacher emails are suppressed for inactive schools, and the teacher-who-is-also-a-parent edge case

## Philosophy

Documentation is maintained incrementally alongside code changes. We avoid generating boilerplate - documentation is added when it provides real value for understanding the system, responding to incidents, or performing specific development tasks.

## Future Documentation Areas

As the system evolves, documentation will be added for:

-   Agent guidance for specific tasks (code review, security review, backend/frontend development)
-   Architecture decisions and patterns
-   Deployment and operations procedures
-   Development workflows and standards
