# APPENDIX D

## UNIT TESTING

### Proponent

Andre

### Date Tested

2026-04-18

---

## Module Name: Registration Validation

### Unit Name: Registration

### Test Case ID: TC-REG-004

### Test Case Description

Duplicate email registration.

### Expected Result

System shows duplicate-email error and does not create profile.

### Actual Result

Performed as expected. Registration displayed the duplicate-email error and profile endpoint was not called.

### Remarks

Passed.

### Evidence

- Automated case: [TC-REG-004.test.tsx](../code/auth/TC-REG-004.test.tsx)
- Screenshot: [TC-REG-004.png](screenshots/TC-REG-004.png)
