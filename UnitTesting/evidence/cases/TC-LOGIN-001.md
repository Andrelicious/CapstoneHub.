# APPENDIX D

## UNIT TESTING

### Proponent

Andre

### Date Tested

2026-04-17

---

## Module Name: Login Screen

### Unit Name: Login

### Test Case ID: TC-LOGIN-001

### Test Case Description

Valid login.

### Expected Result

User is redirected to the student dashboard.

### Actual Result

Performed as expected. Login handler calls Supabase sign-in, resolves role via profile endpoint, and redirects to the expected dashboard route.

### Remarks

Passed.

### Evidence

- Automated case: [TC-LOGIN-001.test.tsx](../code/auth/TC-LOGIN-001.test.tsx)
- Screenshot: [TC-LOGIN-001.png](screenshots/TC-LOGIN-001.png)
