# HAKU Admin Dashboard Changelog

## [v2.2.1] - 2026-02-08

### Fixed
- **Runtime Error**: Fixed `Uncaught ReferenceError: Edit3 is not defined` and other icon import errors in `AdminApp.jsx`.
- **Image 404s**: Resolved client-side 404 errors by ensuring admin saves only filenames (not full URLs) to Google Sheets, matching client display logic.

## [v2.2.0] - 2026-02-07

### Added
- **AdminEditor Component**: Split the admin interface into a dedicated Editor component for better maintainability.
- **Search & Sort**: Added real-time search (Name/ID) and "Newest/Oldest" sorting to the product dashboard.
- **Responsive Navigation**: Implemented a collapsible drawer and mobile-optimized header.

### Changed
- **UI/UX Overhaul**: 
  - Removed the persistent sidebar for a cleaner, linear flow.
  - Applied **HAKU Brand Colors** (Ink `#3E2723`, Paper `#F5F1E8`) throughout the admin interface.
  - Replaced generic status badges with brand-consistent styles.
  - Increased vertical spacing in forms for better mobile touch targets.
- **Architecture**: Migrated complex state management to React (`AdminApp.jsx`).

## [v2.1.0] - 2026-02-06
### Added
- **Mobile-First Design**: Implemented responsive layouts for Data Grid (Card View on mobile) and Editor Modal.

## [v2.0.0] - 2026-02-05
### Added
- **Serverless Admin**: Initial release of the React-based Admin Dashboard powered by Google Apps Script and GitHub API.
- **Authentication**: Simple password-based protection with encrypted GitHub PAT.
- **Image Handling**: Client-side compression and upload to GitHub.
