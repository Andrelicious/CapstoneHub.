# APPENDIX D

## UNIT TESTING

### Proponent

Andre

### Date Tested

2026-04-17

---

## Module Name: Registration Screen

### Unit Name: Registration

### Test Case ID: TC-REG-002

### Test Case Description

Adviser registration.

### Expected Result

Adviser account is created, profile creation endpoint is called, and user is redirected to the adviser dashboard.

### Actual Result

Performed as expected. Register handler signs up an adviser user with Supabase, posts profile payload with role `adviser`, then redirects to the adviser dashboard.

### Remarks

Passed.

### Evidence

- Automated case: [TC-REG-002.test.tsx](../code/auth/TC-REG-002.test.tsx)
- Screenshot: [TC-REG-002.png](screenshots/TC-REG-002.png)
