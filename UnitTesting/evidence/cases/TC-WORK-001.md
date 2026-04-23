# APPENDIX D

## UNIT TESTING

### Proponent

Andre

### Date Tested

2026-04-18

---

## Module Name: Core Workflow

### Unit Name: Repository View

### Test Case ID: TC-WORK-001

### Test Case Description

Adviser can only view repositories.

### Expected Result

Adviser can view repository content but cannot access admin-only remove actions.

### Actual Result

Performed as expected. Adviser saw repository content and view/download actions, with no remove action available.

### Remarks

Passed.

### Evidence

- Automated case: [TC-WORK-001.test.tsx](../code/auth/TC-WORK-001.test.tsx)
- Screenshot: [TC-WORK-001.png](screenshots/TC-WORK-001.png)
