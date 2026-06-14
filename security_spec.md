# Security Specification - BK Auto Admin

## 1. Data Invariants
- A counseling report, RPL sheet, Recap sheet, or Calendar event must strictly belong to the authentic user who created it (tied directly to their `userId` in the document path).
- Modifying documents belongs solely to the authorized creator. Direct user profiles must not leak personal details, and user-to-user path pollution is prevented.
- All documents must possess verified types and schema boundaries.

## 2. The "Dirty Dozen" Threat Payloads (Targeting Firestore Security Rules)
1. **Malicious Write bypass**: Attacking `/users/some_malicious_user/reports/rep_1` using victim user auth session inside security rules.
2. **Path Pollution**: Supplying `/users/victim_user/reports/..%2Fall_reports%2F` to read other users' collections.
3. **Data Pollution / Giant Payloads**: Injecting 1.5MB of unsolicited values inside report student names to trigger database exhaustion.
4. **Incorrect ID Formats**: Using special injection characters (e.g., `../$foo`) as document IDs to break indexes.
5. **Wrong Types Injection**: Writing a list or boolean value into the `studentName` field (expecting a string).
6. **Privilege Escalation**: Attempting to rewrite an existing document created by someone else by mimicking their `userId`.
7. **Unverified Email Access**: Registering writes with `email_verified == false` (if stricter rules apply).
8. **Immutable Field Mutability**: Trying to alter the `createdAt` timestamp after it has been created.
9. **Blanket Query Scraping**: Attempting a collection group query on `/reports` without a valid current user session filter.
10. **State Shortcutting**: Writing final status changes directly without adhering to standard validation schemas.
11. **Spoofed Timestamps**: Modifying/forging a client-provided `createdAt` time in the future instead of leveraging the backend `request.time`.
12. **Foreign Reference Infiltration**: Specifying a valid report with an invalid, non-existent `id` structure.

## 3. Security Assertions Validation
- Default catch-all denies everything: `match /{document=**} { allow read, write: if false; }`
- Authentic, validated users only can perform reads and writes on their specific nested namespaces: `/users/{userId}/...`
- Validations block string over-sizes, bad types, and missing properties.
