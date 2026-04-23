# APPENDIX D

## UNIT TESTING

### Proponent

Andre

### Date Tested

2026-04-17

---

## Module Name: Registration Screen

### Unit Name: Registration

### Test Case ID: TC-REG-003

### Test Case Description

Admin registration.

### Expected Result

Admin account is created, profile creation endpoint is called, and user is redirected to the admin dashboard.

### Actual Result

Performed as expected. Register handler signs up an admin user with Supabase, posts profile payload with role `admin`, then redirects to the admin dashboard.

### Remarks

Passed.

### Evidence

- Automated case: [TC-REG-003.test.tsx](../code/auth/TC-REG-003.test.tsx)
- Screenshot: [TC-REG-003.png](screenshots/TC-REG-003.png)
