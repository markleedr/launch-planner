# Complete release activation

The application release is implemented and locally verified. The database was activated through
Lovable on 24 July 2026. Only the deployment URL and transactional-email secrets remain.

## Lovable activation

1. **Complete:** Lovable connector reauthorised with project write access.
2. **Complete:** `supabase/migrations/20260724000000_procurement_and_sharing.sql` applied through
   Lovable.
3. **Complete:** `supabase/migrations/20260724010000_add_media_agency.sql` applied through Lovable.
4. **Complete:** Lovable Cloud Supabase URL, publishable key and service-role key refreshed.
5. **Complete:** `APP_ORIGIN` configured so scheduled notification links are absolute.
6. **Complete:** `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL` configured for transactional email.
   Lovable confirmed all three secret names without exposing their values.

## Post-activation smoke test

1. Create an owner account and a project.
2. Add two contractors to one deliverable and send both private invitations.
3. Submit both proposals, award one, and confirm the unsuccessful bidder cannot open delivery,
   messages, or collateral.
4. Schedule a collateral request and confirm the scheduled task dispatches it at the calculated
   business-day lead time.
5. Submit, request changes to, and approve collateral.
6. Generate two client share links, revoke one, and confirm the other remains accessible.
7. Export the client summary and confirm its A4 footer, current month/year, and page numbers.

## Local verification completed

- TypeScript check
- Unit and domain tests
- ESLint
- Production build
- Desktop and mobile browser flows
- A4 PDF render and page-by-page visual inspection
