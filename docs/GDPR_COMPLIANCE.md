# GDPR Compliance Guide

This document explains the GDPR compliance features implemented in the Croffer's Nest backend and how to use them.

## Overview

The application implements key GDPR (General Data Protection Regulation) requirements:

- **Article 15**: Right to Access - Users can export all their data
- **Article 17**: Right to be Forgotten - Users can request account deletion
- **Article 7**: Right to Withdraw Consent - Users can manage their consents
- Privacy Policy and Terms of Service acceptance tracking
- Audit logging for all GDPR-related actions

## Database Schema

### User GDPR Fields

The following fields have been added to the `User` model:

```prisma
model User {
  // ... existing fields

  // GDPR Compliance
  privacyPolicyAccepted   Boolean    @default(false)
  privacyPolicyAcceptedAt DateTime?
  termsAccepted           Boolean    @default(false)
  termsAcceptedAt         DateTime?
  marketingConsent        Boolean    @default(false)
  marketingConsentAt      DateTime?
  dataProcessingConsent   Boolean    @default(false)
  dataProcessingConsentAt DateTime?
  deletionRequestedAt     DateTime?
  scheduledDeletionAt     DateTime?
}
```

## API Endpoints

All GDPR endpoints are available at `/api/v1/gdpr` and require authentication.

### 1. Export User Data (Right to Access)

**Endpoint:** `GET /api/v1/gdpr/export`

**GDPR Article:** Article 15 - Right to Access

**Description:** Exports all user data in JSON format.

**Response includes:**
- Personal information (email, name, phone, etc.)
- User profile
- All bookings with payment information
- All reviews
- All messages
- All favorites
- Trip itineraries
- Notifications
- Audit logs (actions performed by user)
- Supplier information (if user is a supplier)

**Example:**

```bash
curl -X GET https://api.croffersnest.com/api/v1/gdpr/export \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**

```json
{
  "personalInformation": {
    "id": 123,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "TOURIST",
    "status": "ACTIVE",
    "emailVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-12-01T00:00:00.000Z",
    "dataExportDate": "2024-12-01T12:00:00.000Z",
    "accountAge": "11 months and 30 days"
  },
  "profile": { ... },
  "bookings": [ ... ],
  "reviews": [ ... ],
  "messages": [ ... ],
  "favorites": [ ... ],
  "itineraries": [ ... ],
  "notifications": [ ... ],
  "auditLogs": [ ... ],
  "suppliers": [ ... ],
  "exportedAt": "2024-12-01T12:00:00.000Z",
  "exportFormat": "application/json"
}
```

**Notes:**
- Sensitive data (passwords, tokens) is excluded
- Response includes `Content-Disposition` header for download
- Action is logged in audit logs

---

### 2. Request Account Deletion (Right to be Forgotten)

**Endpoint:** `POST /api/v1/gdpr/deletion-request`

**GDPR Article:** Article 17 - Right to be Forgotten

**Description:** Schedules account deletion after a 30-day grace period.

**Example:**

```bash
curl -X POST https://api.croffersnest.com/api/v1/gdpr/deletion-request \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**

```json
{
  "message": "Your account deletion has been scheduled. Your data will be permanently deleted on 2024-12-31T12:00:00.000Z. You can cancel this request before that date.",
  "scheduledDeletionDate": "2024-12-31T12:00:00.000Z",
  "gracePeriodDays": 30
}
```

**What happens:**
1. User account is immediately set to `INACTIVE` status
2. Deletion is scheduled for 30 days from request
3. User can still cancel the request during grace period
4. Automated cron job processes deletions daily at 3 AM UTC
5. Action is logged in audit logs

**Important:**
- Users cannot log in during the grace period
- All data will be permanently deleted after grace period
- Deletion includes ALL related data (cascading delete)

---

### 3. Cancel Deletion Request

**Endpoint:** `DELETE /api/v1/gdpr/deletion-request`

**Description:** Cancels a previously scheduled account deletion.

**Example:**

```bash
curl -X DELETE https://api.croffersnest.com/api/v1/gdpr/deletion-request \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**

```json
{
  "message": "Your account deletion request has been cancelled."
}
```

**What happens:**
1. `deletionRequestedAt` and `scheduledDeletionAt` are cleared
2. Account status is restored to `ACTIVE`
3. User can log in again
4. Action is logged in audit logs

---

### 4. Update Consents (Right to Withdraw Consent)

**Endpoint:** `POST /api/v1/gdpr/consents`

**GDPR Article:** Article 7 - Right to Withdraw Consent

**Description:** Update marketing and data processing consents.

**Request Body:**

```json
{
  "marketingConsent": true,
  "dataProcessingConsent": true
}
```

**Example:**

```bash
curl -X POST https://api.croffersnest.com/api/v1/gdpr/consents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "marketingConsent": false,
    "dataProcessingConsent": true
  }'
```

**Response:**

```json
{
  "id": 123,
  "email": "user@example.com",
  "marketingConsent": false,
  "marketingConsentAt": null,
  "dataProcessingConsent": true,
  "dataProcessingConsentAt": "2024-12-01T12:00:00.000Z"
}
```

**Use cases:**
- User opts out of marketing emails
- User withdraws consent for data processing
- User changes preferences

**Notes:**
- Consents can be updated independently
- Timestamps track when consent was given/withdrawn
- Action is logged in audit logs

---

### 5. Get Consent Status

**Endpoint:** `GET /api/v1/gdpr/consents`

**Description:** Returns current state of all consents and policies.

**Example:**

```bash
curl -X GET https://api.croffersnest.com/api/v1/gdpr/consents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**

```json
{
  "id": 123,
  "email": "user@example.com",
  "privacyPolicyAccepted": true,
  "privacyPolicyAcceptedAt": "2024-01-01T00:00:00.000Z",
  "termsAccepted": true,
  "termsAcceptedAt": "2024-01-01T00:00:00.000Z",
  "marketingConsent": false,
  "marketingConsentAt": null,
  "dataProcessingConsent": true,
  "dataProcessingConsentAt": "2024-01-01T00:00:00.000Z",
  "deletionRequestedAt": null,
  "scheduledDeletionAt": null
}
```

**Use cases:**
- Display current consent status in user settings
- Check if user needs to accept updated policies
- Show deletion request status

---

### 6. Accept Privacy Policy and Terms

**Endpoint:** `POST /api/v1/gdpr/accept-policies`

**Description:** Records user acceptance of privacy policy and terms of service.

**Example:**

```bash
curl -X POST https://api.croffersnest.com/api/v1/gdpr/accept-policies \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**

```json
{
  "id": 123,
  "email": "user@example.com",
  "privacyPolicyAccepted": true,
  "privacyPolicyAcceptedAt": "2024-12-01T12:00:00.000Z",
  "termsAccepted": true,
  "termsAcceptedAt": "2024-12-01T12:00:00.000Z"
}
```

**When to use:**
- During user registration
- After policy updates (require re-acceptance)
- Before allowing certain features

---

## Automated Processes

### Scheduled Deletion Cron Job

**Schedule:** Daily at 3 AM UTC

**Process:**
1. Finds all users with `scheduledDeletionAt <= NOW()`
2. Permanently deletes each user account
3. Cascading delete removes all related data:
   - User profile
   - Bookings
   - Reviews
   - Messages
   - Favorites
   - Itineraries
   - Notifications
   - Audit logs
   - Supplier data
4. Logs success/failures

**Code:** `src/gdpr/cron/gdpr-cron.service.ts`

**Manual execution (for testing):**

```typescript
// In a controller or service
await this.gdprService.processScheduledDeletions();
```

### Deletion Reminders (Planned)

**Schedule:** Daily at 9 AM UTC

**Process:**
- Finds users scheduled for deletion in 7 days
- Sends email reminder with cancellation link
- Integration point for MailService

**Status:** Placeholder implemented, email integration pending

---

## Implementation Guide

### Frontend Integration

#### 1. User Settings Page

Display consent toggles:

```typescript
const ConsentSettings = () => {
  const [consents, setConsents] = useState({
    marketingConsent: false,
    dataProcessingConsent: false,
  });

  useEffect(() => {
    // Fetch current consents
    fetch('/api/v1/gdpr/consents', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setConsents(data));
  }, []);

  const updateConsent = async (field, value) => {
    await fetch('/api/v1/gdpr/consents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ [field]: value }),
    });
  };

  return (
    <div>
      <h2>Privacy Settings</h2>
      <Toggle
        checked={consents.marketingConsent}
        onChange={(v) => updateConsent('marketingConsent', v)}
        label="Receive marketing emails"
      />
      <Toggle
        checked={consents.dataProcessingConsent}
        onChange={(v) => updateConsent('dataProcessingConsent', v)}
        label="Allow data processing for analytics"
      />
    </div>
  );
};
```

#### 2. Data Export Button

```typescript
const ExportDataButton = () => {
  const handleExport = async () => {
    const response = await fetch('/api/v1/gdpr/export', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    // Download as JSON file
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-data-export-${Date.now()}.json`;
    a.click();
  };

  return (
    <button onClick={handleExport}>
      Download My Data (GDPR)
    </button>
  );
};
```

#### 3. Account Deletion Flow

```typescript
const DeleteAccountSection = () => {
  const [deletionInfo, setDeletionInfo] = useState(null);

  const requestDeletion = async () => {
    const confirmed = window.confirm(
      'Are you sure? Your account will be deleted in 30 days.',
    );

    if (confirmed) {
      const response = await fetch('/api/v1/gdpr/deletion-request', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      setDeletionInfo(data);
    }
  };

  const cancelDeletion = async () => {
    await fetch('/api/v1/gdpr/deletion-request', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    setDeletionInfo(null);
  };

  return (
    <div>
      {deletionInfo ? (
        <div>
          <p>Your account is scheduled for deletion on:</p>
          <p>{new Date(deletionInfo.scheduledDeletionDate).toLocaleDateString()}</p>
          <button onClick={cancelDeletion}>Cancel Deletion</button>
        </div>
      ) : (
        <button onClick={requestDeletion} className="danger">
          Delete My Account
        </button>
      )}
    </div>
  );
};
```

#### 4. Privacy Policy Acceptance (Registration)

```typescript
const RegistrationForm = () => {
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  const handleSubmit = async (formData) => {
    if (!acceptedPolicies) {
      alert('You must accept the privacy policy and terms');
      return;
    }

    // 1. Create account
    const signupResponse = await fetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(formData),
    });

    const { access_token } = await signupResponse.json();

    // 2. Record policy acceptance
    await fetch('/api/v1/gdpr/accept-policies', {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}` },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... form fields ... */}

      <label>
        <input
          type="checkbox"
          checked={acceptedPolicies}
          onChange={(e) => setAcceptedPolicies(e.target.checked)}
        />
        I accept the{' '}
        <a href="/privacy-policy">Privacy Policy</a> and{' '}
        <a href="/terms">Terms of Service</a>
      </label>

      <button type="submit">Sign Up</button>
    </form>
  );
};
```

---

## Testing

### Test Data Export

```bash
# Login
TOKEN=$(curl -X POST http://localhost:3333/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  | jq -r '.access_token')

# Export data
curl -X GET http://localhost:3333/api/v1/gdpr/export \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.' > user-data-export.json

# View exported data
cat user-data-export.json
```

### Test Deletion Request

```bash
# Request deletion
curl -X POST http://localhost:3333/api/v1/gdpr/deletion-request \
  -H "Authorization: Bearer $TOKEN"

# Check status
curl -X GET http://localhost:3333/api/v1/gdpr/consents \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.deletionRequestedAt, .scheduledDeletionAt'

# Cancel deletion
curl -X DELETE http://localhost:3333/api/v1/gdpr/deletion-request \
  -H "Authorization: Bearer $TOKEN"
```

### Test Consent Management

```bash
# Update consents
curl -X POST http://localhost:3333/api/v1/gdpr/consents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"marketingConsent":false,"dataProcessingConsent":true}'

# Check current consents
curl -X GET http://localhost:3333/api/v1/gdpr/consents \
  -H "Authorization: Bearer $TOKEN"
```

---

## Compliance Checklist

- [x] **Article 15 - Right to Access**: Users can export all their data
- [x] **Article 17 - Right to be Forgotten**: Users can request deletion with grace period
- [x] **Article 7 - Right to Withdraw Consent**: Users can manage consents
- [x] **Consent tracking**: All consents are timestamped
- [x] **Privacy policy acceptance**: Tracked with timestamp
- [x] **Terms of service acceptance**: Tracked with timestamp
- [x] **Audit logging**: All GDPR actions are logged
- [x] **Automated deletion**: Cron job processes scheduled deletions
- [ ] **Deletion reminders**: Email reminders 7 days before deletion (TODO)
- [ ] **Data portability**: Export in machine-readable format (JSON ✓, XML pending)
- [ ] **Privacy policy updates**: Mechanism to notify users of policy changes

---

## Security Considerations

### Data Protection

1. **Sensitive Data Exclusion**: Passwords, tokens, and secrets are never included in exports
2. **Authentication Required**: All GDPR endpoints require valid JWT token
3. **User Isolation**: Users can only access/modify their own data
4. **Audit Trail**: All GDPR actions are logged with IP address and user agent

### Deletion Safety

1. **Grace Period**: 30-day window to prevent accidental deletions
2. **Account Deactivation**: Immediate `INACTIVE` status prevents further use
3. **Cascading Deletes**: Properly configured to remove all related data
4. **Backup Recommendation**: Keep database backups for 30 days after deletion

### Compliance

1. **GDPR Timelines**: Data exports provided immediately, deletions within 30 days
2. **Data Minimization**: Only necessary data is stored
3. **Consent Granularity**: Separate consents for marketing and data processing
4. **Right to Object**: Users can withdraw consent at any time

---

## Common Issues

### Issue: User requests deletion but has active bookings

**Solution:**
- Business logic should check for active bookings before allowing deletion
- Option 1: Prevent deletion until bookings are completed
- Option 2: Cancel active bookings and refund
- Option 3: Complete deletion after bookings expire

**Implementation (add to GdprService):**

```typescript
async requestDeletion(userId: number) {
  // Check for active bookings
  const activeBookings = await this.prisma.booking.count({
    where: {
      userId,
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
  });

  if (activeBookings > 0) {
    throw new BadRequestException(
      `Cannot delete account with ${activeBookings} active booking(s). Please wait for bookings to complete or contact support.`
    );
  }

  // Proceed with deletion...
}
```

### Issue: Deleted user data appears in supplier dashboards

**Solution:**
- Anonymize instead of delete where required for business records
- Replace user info with "Deleted User" in supplier-visible records
- Keep necessary transaction records for legal/accounting purposes

---

## Future Enhancements

1. **Multi-format Export**: XML, CSV options
2. **Partial Data Export**: Allow users to export specific data categories
3. **Data Portability**: Direct transfer to other services
4. **Consent History**: Track all consent changes over time
5. **Email Notifications**:
   - Confirmation emails for GDPR actions
   - Deletion reminders
   - Policy update notifications
6. **Admin Dashboard**: View GDPR statistics and pending deletions
7. **Data Retention Policies**: Automatic cleanup of old data
8. **Privacy Impact Assessments**: Documentation for new features

---

## Resources

- [GDPR Official Text](https://gdpr-info.eu/)
- [ICO Guide to GDPR](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/)
- [Article 15 - Right to Access](https://gdpr-info.eu/art-15-gdpr/)
- [Article 17 - Right to Erasure](https://gdpr-info.eu/art-17-gdpr/)
- [NestJS Cron Documentation](https://docs.nestjs.com/techniques/task-scheduling)
