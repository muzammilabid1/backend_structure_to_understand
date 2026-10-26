# Data Analytics Platform

Internal analytics app for Learning with Parents, built with Next.js and TypeScript.

This README reflects the current state of `data-analytics-platform` in the monorepo.

## Overview

The app currently includes:

- `Home` page (`/`) with platform status cards.
- `Impact` dashboard (`/impact`) with 9 chart sections plus KPI cards.
- `Families` dashboard (`/families`) with 3 chart sections.
- `Data Dictionary` page (`/data-dictionary`) with metric definitions.
- `Content` and `Query Builder` pages as placeholders (`Coming Soon`).

Common features in active dashboards:

- School filter via `/api/schools`
- All Schools vs specific school mode
- CSV and image export per chart (`ChartExportMenu`)
- Skeleton loading states

## Tech Stack

| Category      | Technology                            |
| ------------- | ------------------------------------- |
| Framework     | Next.js 14                            |
| Language      | TypeScript                            |
| Styling       | SCSS modules                          |
| Charts        | Recharts (+ `@nivo/line` installed)   |
| Icons         | `lucide-react`                        |
| Data Fetching | SWR                                   |
| SQL Layer     | Kysely + raw SQL                      |
| Database      | PostgreSQL via `@lwp/postgres-client` |

## Getting Started

This documentation provides instructions on how to run the `data-analytics-platform` application locally within the monorepo.

### Prerequisites

- Node.js `^22.23.4`
- Yarn `1.22.x`
- PostgreSQL access
- Monorepo dependencies installed at the root level

### 1) Configure Local Subdomains

To simulate the production subdomain structure locally, update your system hosts file.

##### Windows

Edit the hosts file located at:

```bash
C:\Windows\System32\drivers\etc\hosts
```

##### Linux / macOS

Edit the hosts file located at:

```bash
/etc/hosts
```

Add the following entries at the end of the file:

```bash
# Local Subdomains Configuration:
127.0.0.1   explore.dev.local
127.0.0.1   analytics.dev.local
127.0.0.1   dev.local
```

This allows the application to run locally using the same subdomain structure used in dev environments.

### 2) Install Dependencies

Run the following command from the root of the monorepo:

```bash
yarn install
```

### 3) Configure Platform Environment Variables

In the platform (frontend) environment file, add the following variable:

```bash
NEXT_PUBLIC_COOKIE_DOMAIN=.dev.local
```

This enables shared cookies across local subdomains, allowing authentication to work between the platform and analytics dashboard.

### 4) Configure Analytics Environment Variables

Create the .env file in the `data-analytics-platform` directory with the following content:

```bash
PGHOST=your-db-host
PGPORT=5432
PGDATABASE=your-database
PGAPPUSER=your-username
PGAPPPASSWORD=your-password
NEXT_PUBLIC_COOKIE_DOMAIN=.dev.local
NEXT_PUBLIC_LWP_ENV=local
NEXT_PUBLIC_PLATFORM_BASE_URL=http://explore.dev.local:3000
```

### 5) Run the Analytics Application

#### Development Mode

To start the analytics platform in development mode:

```bash
yarn dev:local:subdomain
```

#### Local Build Mode

To run the application using a local production build:

```bash
yarn build:start:local:subdomain
```

#### Application URL:

```bash
http://analytics.dev.local:3001
```

### 6) Run the Platform Application

#### Development Mode

To start the platform in development mode:

```bash
yarn dev:local:subdomain
```

#### Local Build Mode

To run the application using a local production build:

```bash
yarn build:start:local:subdomain
```

#### Application URL:

```bash
http://explore.dev.local:3001
```

### 6) Accessing the Analytics Dashboard

Authentication is shared between the platform and analytics dashboard using cookies.

#### Follow these steps:

1. Login to the platform as an admin user:

```bash
http://explore.dev.local:3000
```

2. After logging in, navigate to:

```bash
http://analytics.dev.local:3001
```

You will be automatically authenticated, since both applications share cookies via the .dev.local domain.

### Troubleshooting

- No data in charts
- Missing analytics tables: If you have just created a new database, the analytics tables may be empty. This happens because the `clean_up_and_insert_pupil_fact()` function, which populates the analytics tables, runs via a PostgreSQL cron job. To insert the initial data, manually execute the following function in the database:

```bash
select clean_up_and_insert_pupil_fact()
```

## Project Structure

```text
data-analytics-platform/
├── components/
│   ├── Charts/                    # Impact + Families chart components
│   ├── Shared/                    # Chart export + skeleton components
│   └── DashboardLayout.tsx        # Sidebar/navigation wrapper
├── data/
│   ├── impact_dash_metrics.csv    # Unified metrics source
│   └── lwp_school_ids.csv
├── hooks/
│   ├── useImpactData.ts           # 3-mode impact data hook
│   ├── usePupilFactImpactData.ts  # pupil-fact endpoint hooks
│   └── useFamiliesData.ts         # families endpoint hooks
├── lib/
│   ├── analytics-db.ts
│   ├── analytics-queries.ts
│   ├── analytics-queries-raw-sql.ts
│   ├── analytics-queries-backup.ts
│   ├── database.ts
│   ├── database.js
│   └── swr-config.ts
├── pages/
│   ├── api/
│   │   ├── impact/
│   │   ├── families/
│   │   ├── schools.ts
│   │   ├── test-db.ts
│   │   └── test-simple.ts
│   ├── impact.tsx
│   ├── families.tsx
│   ├── content.tsx
│   ├── data-dictionary.tsx
│   ├── query-builder.tsx
│   ├── test-pupil-fact.tsx
│   └── index.tsx
├── sql/
├── styles/
├── types/
└── package.json
```

## API Endpoints

All dashboard endpoints are `GET` routes and support `schoolId` and `showAllSchools` where applicable.

### Impact API

Legacy or per-metric endpoints:

- `/api/impact/kpis`
- `/api/impact/student-totals`
- `/api/impact/total-feedbacks`
- `/api/impact/average-feedbacks`
- `/api/impact/feedback-percentage`
- `/api/impact/pp-percentage`
- `/api/impact/parents-registered`
- `/api/impact/registered-pupils`
- `/api/impact/pupils-watched-video`
- `/api/impact/photos-uploaded`
- `/api/impact/audio-clips-uploaded`
- `/api/impact/pupils-completed-activities`
- `/api/impact/metrics` (CSV-backed unified payload)

Pupil fact endpoints:

- `/api/impact/pupil-fact-kpis`
- `/api/impact/pupil-fact-student-totals`
- `/api/impact/pupil-fact-feedback-percentage`
- `/api/impact/pupil-fact-total-feedbacks`
- `/api/impact/pupil-fact-average-feedbacks`
- `/api/impact/pupil-fact-pp-percentage`
- `/api/impact/pupil-fact-parents-registered`
- `/api/impact/pupil-fact-videos-watched`
- `/api/impact/pupil-fact-photos-uploaded`
- `/api/impact/pupil-fact-audio-uploaded`
- `/api/impact/pupil-fact-activities-completed`

Summary-table optimized endpoints:

- `/api/impact/kpis-optimized`
- `/api/impact/student-totals-optimized`
- `/api/impact/total-feedbacks-optimized`
- `/api/impact/average-feedbacks-optimized`
- `/api/impact/feedback-percentage-optimized`

### Families API

- `/api/families/total-feedback`
- `/api/families/pupils-with-parent-feedback`
- `/api/families/pupil-premium-percentage-new`

### Other API

- `/api/schools`
- `/api/test-db`
- `/api/test-simple`

## Related Docs

- `ANALYTICS_MIGRATION.md`
- `PUPIL_FACT_IMPLEMENTATION.md`

## License

Internal use only - Learning with Parents
