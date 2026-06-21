# Legacy Feature Documentation: Supabase Storage Setup

This document describes the Supabase Storage bucket configurations and access rules.

---

## 1. Storage Buckets

We leverage two main buckets:
- `medical-documents`: Storing uploaded patient visit documents, histories, and record files.
- `certificates`: Storing issued medical certificates in PDF or image format.

---

## 2. Policy Requirements

- **Private Access**: All buckets are configured as **private** (non-public).
- **Signed URLs**: URLs sent to frontend are temporary, signed links generated on-demand with a short lifespan (e.g. 15 minutes).
- **Security Check**:
  - Only the owner of the document (the patient) or the doctor assigned to the organization/appointment is allowed to request signed URLs.
  - Technical support users are completely blocked from requesting URLs from these buckets.
