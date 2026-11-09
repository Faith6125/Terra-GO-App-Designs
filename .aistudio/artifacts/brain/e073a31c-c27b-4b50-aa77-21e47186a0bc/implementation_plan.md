# Forgot Password Dual Recovery Flow (Phone & Email)

Enables staff to recover their account and reset their password using either their mobile phone number or email address, verify via SMS/email OTP, set a new password, and immediately log in.

## User Review & Critical Decisions

> [!IMPORTANT]
> This plan is strictly focused on the requested scope:

- **Entry Point**: A discreet, accessible **"Forgot password?"** link on the login screen.
- **Dual Identifier Choice**: Staff can select between entering their **Phone Number** (with country code) or their **Email Address**.
- **Phone Number Path**:
  1. User enters their phone number and taps **"Send Code"**.
  2. A 6-digit SMS OTP is sent (with on-screen toast for testing convenience).
  3. User enters and verifies the 6-digit code.
  4. User is prompted to **Create New Password** (with confirmation & visibility toggle).
  5. User can log in with their **phone number + new password**.
- **Email Address Path**:
  1. User enters their email address and taps **"Send Code"**.
  2. A 6-digit reset code is sent to their email.
  3. User enters and verifies the 6-digit code.
  4. User is prompted to **Create New Password**.
  5. User can log in with their **email + new password**.
- **Scope Boundary**: Strictly confined to this recovery workflow; no changes outside this scope.

---

## 1. Overview & Core Concept

- **What It Does**: Provides a self-service password reset flow directly from the login interface. Whether a staff member registered with a mobile phone or an email address, they can quickly reset their forgotten password via secure verification code.
- **Target Audience / Persona**: School transit drivers and minders who forget their password in the field and need to quickly reset credentials and resume duty.
- **Key Value**: Eliminates password lockouts and provides parity between phone-first and email-first staff accounts.

---

## 2. User Experience & Visual Design

### Step-by-Step Flow

```
                     ┌────────────────────────────────┐
                     │          Login Screen          │
                     │  [Phone / Email]  [Password]   │
                     │      [Forgot password?] ───────┼────────┐
                     └────────────────────────────────┘        │
                                                               │ (clicks link)
                                                               ▼
                     ┌────────────────────────────────────────┐
                     │         Reset Password Screen          │
                     │     [ Phone Number ] | [ Email ]       │
                     └───────────────────┬────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │ (Phone chosen)                                │ (Email chosen)
                 ▼                                               ▼
      ┌─────────────────────┐                         ┌─────────────────────┐
      │ Enter Phone Number  │                         │ Enter Email Address │
      │ [+254] [ 712... ]   │                         │ [ staff@terra.go ]  │
      │ [ Send SMS Code ]   │                         │ [ Send Reset Code ] │
      └──────────┬──────────┘                         └──────────┬──────────┘
                 │                                               │
                 ▼                                               ▼
      ┌─────────────────────┐                         ┌─────────────────────┐
      │ Send SMS OTP        │                         │ Send Email OTP      │
      └──────────┬──────────┘                         └──────────┬──────────┘
                 │                                               │
                 └───────────────────────┬───────────────────────┘
                                         │
                                         ▼
                     ┌────────────────────────────────────────┐
                     │       Verify 6-Digit Reset Code        │
                     │       [ _ ][ _ ][ _ ][ _ ][ _ ][ _ ]   │
                     │       (Auto-fill toast + Resend timer) │
                     └───────────────────┬────────────────────┘
                                         │
                                         ▼
                     ┌────────────────────────────────────────┐
                     │          Create New Password           │
                     │   • New Password                       │
                     │   • Confirm Password                   │
                     │   [ Save Password & Log In ]           │
                     └───────────────────┬────────────────────┘
                                         │
                                         ▼
                     ┌────────────────────────────────────────┐
                     │      Success & Active Login            │
                     │ (Persists new password in staff store) │
                     └────────────────────────────────────────┘
```

1. **"Forgot password?" Trigger**:
   - Clean, accessible text link placed right below the password field or primary login action.
   - Distinct hover and active states using brand navy (`#303690`).
2. **Identifier Selector View**:
   - Clean segmented toggle: **Phone Number** vs. **Email**.
   - For phone: Country code selector (+254 default) + local phone input.
   - For email: Email input field with validation.
   - Action: **"Send Code"** primary button (`#E70D8D`).
   - "Back to Login" link at the bottom.
3. **OTP Code Verification View**:
   - 6 individual numeric input cells with automatic next-cell focus.
   - Simulated push notification bar with one-tap auto-fill for instant sandbox testing.
   - 30-second countdown for resending code.
4. **Create New Password View**:
   - Password and Confirm Password inputs with eye toggle for visibility.
   - Minimum 6 characters check and match indicator.
   - Button: **"Save Password & Log In"** or transition to login with prefilled credentials.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Seamless In-Modal Flow**:
  - *Chosen Approach*: Manage reset steps (`forgot_identifier` -> `forgot_otp` -> `create_password`) within `components/LoginScreen.tsx` state machine.
  - *Why*: Fast, smooth transitions without page reloads or broken state.
- **Decision 2: Local & Storage Sync**:
  - *Chosen Approach*: When a password is reset, update the staff record in `localStorage` (`terra_go_staff_roster_v2`) and memory so the new password immediately works for future logins.
  - *Why*: Ensures state persistence across reloads.
- **Decision 3: Any Number / Email Compatibility**:
  - *Chosen Approach*: If an entered phone or email matches an existing staff member, their record is updated; if a new identifier is entered, a staff account is instantiated and verified.
  - *Why*: Allows any phone number or email to proceed smoothly without dead ends.

---

## 4. Technical Architecture & State Strategy

### State Additions in `LoginScreen.tsx`

- `step`:
  - `'identifier'` (main entry)
  - `'password_login'` (regular password entry)
  - `'forgot_identifier'` (enter phone or email for reset)
  - `'forgot_otp'` (verify reset code)
  - `'create_password'` (set new password)
- `forgotAuthMode`: `'phone' | 'email'`
- `forgotPhone`: string
- `forgotEmail`: string
- `isResetFlow`: boolean (flags password creation as a recovery flow)

### Event Handlers

- `handleForgotPasswordClick()`: Switches `step` to `'forgot_identifier'`.
- `handleForgotSubmit()`: Validates input, generates 6-digit OTP, triggers simulated SMS/email banner, and switches `step` to `'forgot_otp'`.
- `handleForgotOtpComplete(code)`: Validates OTP against generated code, then transitions to `'create_password'`.
- `handleSaveNewPassword()`: Updates staff record in storage with new password, and executes `onLogin(true, staffMember)`.
