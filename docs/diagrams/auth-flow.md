# Authentication flow

Sign-up with email verification, sign-in, password reset, and how the session is kept fresh. Verification and reset use 6-digit codes typed into the app, so they work even when the email is opened on another device. Emails go through custom SMTP because Supabase's built-in sender only delivers to project team members.

```mermaid
sequenceDiagram
  actor User
  participant App
  participant Storage as SecureStore and AsyncStorage
  participant Auth as Supabase Auth
  participant Mail as Email via Gmail SMTP

  Note over User,Mail: Sign up and verify email
  User->>App: Email and password
  App->>App: Validate with zod, password 8 to 72 characters
  App->>Auth: signUp
  Auth->>Mail: Verification code
  Mail-->>User: Email with a 6-digit code
  User->>App: Types the code
  App->>Auth: verifyOtp, type email
  Auth-->>App: Access token (JWT) and refresh token
  App->>Storage: Encrypt session with a new AES key and save

  Note over User,Mail: Sign in
  User->>App: Email and password
  App->>Auth: signInWithPassword
  Auth-->>App: Session, or "email not confirmed"
  App->>Storage: Encrypt and save

  Note over User,Mail: Password reset
  User->>App: Forgot password, enters email
  App->>Auth: resetPasswordForEmail
  Auth->>Mail: Reset code
  Mail-->>User: Email with a 6-digit code
  User->>App: Types the code and a new password
  App->>Auth: verifyOtp, type recovery
  App->>Auth: updateUser with the new password

  Note over User,Mail: While the app is open
  App->>Auth: On foreground, startAutoRefresh
  Auth-->>App: New access token and rotated refresh token
  App->>Storage: Save new encrypted session
  App->>App: On background, stopAutoRefresh

  Note over User,Mail: Opening the app offline
  App->>Storage: Read the stored session
  App->>App: Access token expired and no connection, so keep the stored user signed in
  App->>Auth: Refresh once the connection returns
```
