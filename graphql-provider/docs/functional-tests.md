# Functional tests

Functional tests run the real Nest providers against a real Postgres, rather than mocking the database. They live next to the code they cover as `*.functional-test.ts` and are run by a separate Jest project, so `yarn test` does not need a database.

## Running them

From the repository root, once:

```sh
yarn db:setup   # starts a Postgres container and runs the migrations
yarn db:seed    # loads the static reference data (periods, year groups) and some fake data
```

The static reference data matters: `lwp_school.curentPeriodIndex` is a foreign key onto `static_lwp_period`, so seeding is not optional — without it, any test that sets a school's academic year fails on a constraint.

Then, from `graphql-provider`:

```sh
yarn test:functional                                    # everything
yarn test:functional --runTestsByPath src/data-import/functional-tests/link-confidence.functional-test.ts
```

Connection details come from the `PG*` variables in `.env`, which is what TypeORM reads, so the seeding client and the code under test always address the same database. `DATABASE_URL` is not used — locally it names a unix socket that a test run on the host cannot reach. Set `TEST_DATABASE_URL` to point the tests at a different database.

## Writing them

Each test seeds the school it needs and removes it afterwards, so tests can be read and changed one at a time. `functional-tests/seeds.ts` holds the fixtures; `cleanUpSchool` deletes a school's rows in an order the foreign keys accept.

Two things are worth knowing before adding a case to the import review:

-   A pupil is only offered as a link candidate if it has a parent whose link is something other than `IMPORTED`. Without one, no candidate link is generated at all and nothing is under test.
-   A candidate must first pass the `isMatch` filter to exist: the MIS id or the UPN must agree, or two of forename/surname/date of birth must. A pair that agrees on less than that is never proposed, so a test expecting `PENDING` needs a pair that clears `isMatch` but not confidence.

Prefer a handful of tests, each named for the behaviour it pins, over generated permutations. The previous suite in this directory used a four-flag truth table over shared fixtures; when it drifted from the code, no one could tell which of the sixteen cases mattered, and the whole thing was commented out rather than fixed.
