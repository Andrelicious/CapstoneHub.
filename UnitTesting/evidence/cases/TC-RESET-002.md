# APPENDIX D

## UNIT TESTING

### Proponent

Andre

### Date Tested

2026-04-18

---

## Module Name: Password Recovery

### Unit Name: Reset Password

### Test Case ID: TC-RESET-002

### Test Case Description

Reset password validation.

### Expected Result

System shows password mismatch validation and does not submit update.

### Actual Result

Performed as expected. Validation error was shown and password update was not called.

### Remarks

Passed.

### Evidence

- Automated case: [TC-RESET-002.test.tsx](../code/auth/TC-RESET-002.test.tsx)
- Screenshot: [TC-RESET-002.png](screenshots/TC-RESET-002.png)
