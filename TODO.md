## TODO
- [ ] Explore using possibility to check for extension updates before they were downloaded and inform users about this capability
- [ ] Store extension permissions in update history and show permission changes when extensions update
  - Track permissions and hostPermissions in extension snapshots
  - Highlight when new permissions are added in updates
  - Show permission diff in update history UI
  - Alert users to significant permission changes (security feature)
- [ ] Increase the number of locales to 40
- [x] Set up deployment to Chrome Web Store via GitHub Actions (done in 1.3.0 — see docs/RELEASE.md)
- [ ] Publish to Microsoft Edge Add-ons and set up deployment via GitHub Actions
- [ ] Publish to Firefox Add-ons and set up deployment via GitHub Actions


- [ ] Muted extensions list in Settings — a section listing every muted extension with an Unmute button, so "muted and forgotten" extensions stay visible. Data already lives in `settings.extensionPreferences.mutedExtensions`
- [ ] Keep history of uninstalled extensions — today `onUninstalled` wipes the extension's history (`extensions-management.ts`). Instead: keep the record, show an "Uninstalled" badge on the card, and add a manual "Delete history" action per extension
- [ ] "View on Web Store" from a version row — link each update to the extension's Chrome Web Store page so a security review has somewhere to go
- [ ] Per-extension scope for auto-disable — let the user pick which extensions get auto-disabled on update instead of all-or-nothing
- [x] Persist active options tab in the URL hash (`#settings`) — tab survives reload and becomes linkable (done in 1.2.0)
- [ ] Settings shortcut in the popup header — standard gear icon opening the options page on the Settings tab
- [ ] Auto-read the tracker's own updates — the tracker currently notifies about its own update ("noise about noise"); mark those as read automatically or label them distinctly