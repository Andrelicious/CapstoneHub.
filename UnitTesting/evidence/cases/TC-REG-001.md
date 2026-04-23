# APPENDIX D

## UNIT TESTING

### Proponent

Andre

### Date Tested

2026-04-17

---

## Module Name: Registration Screen

### Unit Name: Registration

### Test Case ID: TC-REG-001

### Test Case Description

Student registration.

### Expected Result

    Student account is created, profile creation endpoint is called, and user is redirected to the student dashboard.

### Actual Result

Performed as expected. Register handler signs up a student user with Supabase, posts profile payload with role `student`, then redirects to the student dashboard.

### Remarks

Passed.

### Evidence

- Automated case: [TC-REG-001.test.tsx](../code/auth/TC-REG-001.test.tsx)
- Screenshot: [TC-REG-001.png](screenshots/TC-REG-001.png)
