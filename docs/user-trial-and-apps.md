# User App Origin and Trial Activation

## App Origin Tracking

Users in the shared MongoDB database contain origin and client access metadata written by EasyQuiz and Hepi auth services:

- `sourceApp`: The application where the account was initially created (`easyquiz`, `hepi`, `extension`, `search`).
- `lastLoginApp`: The application used during the user's most recent login session.
- `connectedApps`: Array of unique applications the user has authenticated through.

### Easy Admin Display

- **Users List**: Displays a badge indicating `sourceApp` and an indicator for multi-app users.
- **User Detail Overview**: Highlights `Source App`, `Last Login App`, and the full set of `Connected Apps` styled with distinctive app badges.

---

## One-Click Trial Activation

Easy Admin provides instant trial activation through `POST /api/users/:id/trial/activate`.

### Architecture & Upstream Proxy

The BFF validates the user ID as an ObjectId and proxies to Hepi's authenticated endpoint:
- **Upstream route**: `POST /user/activate-trial`
- **Authentication**: `X-Admin-Secret`
- **Body**: `{ "identifier": "<userId>" }`

Easy Admin never mutates user plan or points directly in MongoDB. Hepi acts as the domain authority for trial fulfillment.

### Fulfillment Behavior

1. **Free or Basic Users**: Upgrades to a 3-day Premium trial (`plan.name = 'Premium'`, `isTrial = true`).
2. **Pro Users**: Adds a 3-day Premium `trialOverlay` while preserving the Pro subscription snapshot.
3. **Existing Premium Users**: Extends the current expiration by 3 days.
4. **Points Grant**: Awards 200 expiring points valid for 3 days via Hepi's `PointsService.addExpiringPoints`.
5. **Metadata Update**: Records `trialActivatedAt = now`, sets `lastLoginApp = 'hepi'`, and adds `'hepi'` to `connectedApps`.

### Frontend Interaction

Clicking **Activate Trial** (or **Extend Trial (+3d)**) triggers an immediate mutation without multi-step modal forms. The UI updates the user view, points balance, and plan expiration in real time.
