# ADR 001: Board Relations for Contact Data

**Date:** 2026-03-18 **Status:** Accepted **Tickets:** LWP-8931, LWP-8997

---

## Context

The monday-hubspot-sync service synchronises school records between HubSpot and Monday.com. Each school record includes contact information (name and email of the main contact person).

Previously, contact data was stored as plain text columns directly on the Schools board:

```
Schools board item
├── School Name: "ABC Primary"
├── Main Contact: "Jane Smith"      ← text column
└── Main Contact Email: "jane@…"   ← text column
```

This approach had several problems:

-   **Data duplication**: the same contact could appear across multiple school items with no shared identity.
-   **No relational integrity**: Monday.com automations cannot traverse a text field the way they can a board relation.
-   **Limited scalability**: a school with more than one contact required either multiple text columns or a single concatenated string.
-   **Schema rigidity**: adding contact-level fields (phone, role, notes) would require adding more columns to the Schools board.

---

## Decision

Contacts are now stored as first-class items on a dedicated **Contacts board**. The Schools board links to them through a **board relation column** (Main Contact), and the Contacts board holds a reciprocal relation column (Contact School) that links back to the school.

```
Schools board item          Contacts board item
├── School Name             ├── Name: "Jane Smith"
└── Main Contact ──────────→└── Contact School ──────→ (back to school)
      (board relation)             (board relation)
```

The creation workflow in `createMondayItemWithContacts()` follows this order:

1. Create the school item (Schools board) — needed first so its ID is available.
2. Create each contact item (Contacts board), embedding the school ID in the Contact School relation at creation time.
3. Update the school's Main Contact relation with the contact IDs returned in step 2.

This order is required because Monday.com does not support creating both sides of a board relation in a single API call.

---

## Consequences

**Positive:**

-   Contacts can be linked to multiple schools without duplicating data.
-   Monday automations and dashboards can be built on the Contacts board independently.
-   Adding contact-level fields in future only requires schema changes on the Contacts board.
-   The bidirectional relation is queryable from either side via the Monday GraphQL API (`linked_item_ids`).

**Negative / Trade-offs:**

-   Creating a school now requires three API calls instead of one (school → contacts → link school). This is a latency increase per record but acceptable at the volumes involved.
-   Existing Schools board items that have contact data in text columns will not be migrated automatically.
-   The `buildColumnValues()` function intentionally omits contact fields. Developers unfamiliar with the architecture may be surprised that contact data is not in the column values object — inline comments explain this.

**Migration:**

Deployments that have existing text-based contact data will need a one-time migration: fetch all Schools board items, create a Contacts board item for each text-based contact, and update the school's Main Contact column to the new board relation.
