# Overview

Whenever data is imported by CSV upload or Wonde sync, it is written to our shadow tables as normal.

## New tables

We are introducing 2 new tables:

1. `imported_school_data_proposed_link`

    This table is used to store links between imported pupils/classes and platform pupils/classes.

    Links have a status field, which can be one of:

    - `PENDING` - the link has not been selected yet
    - `SELECTED` - the link has been explicitly selected by the user
    - `REJECTED` - the link has been explicitly rejected by the user
    - `AUTO_SELECTED` - the link has been automatically selected by the system
    - `AUTO_REJECTED` - the link has been automatically rejected by the system

-   `imported_school_data_proposed_change`

    This table is used to store changes (create/update/delete operations) to platform pupils/classes that arise from data imports.

## New code

We are introducing a new service class, `DataImportService`, that exposes the following interface:

```typescript
interface DataImportService {
    processImportedSchoolData(importedSchoolId: string): Promise<void>;
}
```

Once the shadow tables are updated, the `processImportedSchoolData` method should be called, i.e.:

```typescript
await this.dataImportService.processImportedSchoolData(importedSchoolId);
```

This method first attempts to resolve pupil links.

If any pupil links need to be manually resolved, it will stop and return.

Assuming there are no pupil links to resolve, it will then attempt to resolve class links.

If any class links need to be manually resolved, it will stop and return.

Once all links have been resolved, it will go on to resolve pupil and class field-level changes.

## Next steps

Chris is nearly finished implementing the pupil and class linking logic.

For the first slice of functionality, we need to wire up the CSV import and Wonde sync code to call the new `processImportedSchoolData` method.

Once that is done, we can start implementing the UI to render a list of proposed pupil/class links.

We will need to implement the GraphQL layer to support this.

Then we will need to implement the functionality to allow users to select proposed pupil/class links...

## More new code

We are also introducing the `PupilLinkingService` and `ClassLinkingService`:

```typescript
interface PupilLinkingService {
    selectLink(importedPupilId: string, platformPupilId: string): Promise<void>;
    rejectLinks(importedPupilId: string): Promise<void>;
}

interface ClassLinkingService {
    selectLink(importedPupilId: string, platformPupilId: string): Promise<void>;
    rejectLinks(importedPupilId: string): Promise<void>;
}
```

When a user _selects_ (accepts) a proposed link, `selectLink` should be called. This will mark the selected link as `SELECTED`, mark any other links for the chosen pupils as `REJECTED`, and refresh any other affected proposed links.

When a user _rejects_ a proposed link (i.e. the user chooses _not_ to link the imported pupil to an existing one, either because the imported pupil is a _new_ pupil, or they do not want to import them), `rejectLinks` should be called. This will mark all links for the chosen pupils as `REJECTED`, and refresh any other affected proposed links.

## Feature flagging

We would like to introduce a new feature flag to govern this new behaviour.

We intend to copy the existing Wonde and CSV code into this new module/service, and preserve the existing legacy code.

If the feature flag is enabled, we should use code from the new module/services.

Otherwise, we should continue to call the code in the legacy services.
