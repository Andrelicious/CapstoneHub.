# CAPSTONE HUB - LIVE DEMO SCRIPT
## 15-Minute Walkthrough for Presentation

---

## 🎬 INTRO (1 minute)

**What to say:**

> "Thank you everyone. I want to show you **Capstone Hub**, an OCR-powered repository for academic capstone projects. 
> 
> This system makes it easy for students to submit their work, gives professors tools to review, and ensures everything is searchable and archived.
> 
> Let me walk you through how it works from start to finish."

**What to do:**
- Open browser, show landing page
- Point out the clean, modern design
- Note the three key sections: Students, Advisers, Admins

---

## 👨‍🎓 STUDENT FLOW (8 minutes)

### Step 1: Login (1 min)

**Say:**
> "Let's start with a student. I'll log in as a student account."

**Do:**
1. Click "Log In"
2. Enter student email + password
3. Click "Login"
4. Wait for dashboard to load

**Point out:** Clean dashboard, no clutter, intuitive layout

### Step 2: View Student Dashboard (1 min)

**Say:**
> "Here's the student dashboard. I can see my submissions, their status, and quick actions to submit new work or browse existing capstones."

**Do:**
1. Point to the stats at top (Total, Draft, Processing, Pending, Approved)
2. Show the "My Submissions" section
3. Highlight the "Submit New Capstone" button

**Key message:** Everything a student needs is right here

### Step 3: Start New Submission - STEP 1 (2 min)

**Say:**
> "Let me submit a new capstone project. I'll click 'Submit New Capstone' and fill in the details."

**Do:**
1. Click "Submit New Capstone" button
2. **Wizard Step 1 appears instantly** ← Point this out!
3. Fill form:
   - Title: "AI-Powered Document Processing System"
   - Description: "A system using OCR and machine learning to extract and categorize academic documents"
   - Program: "Computer Science"
   - Doc Type: "Thesis"
   - School Year: "2024"
   - Category: "Technology"
   - Tags: "AI, OCR, Machine Learning"
4. Click "Next"

**Point out:** Step 1 validated instantly, form feels responsive

### Step 4: Upload PDF - STEP 2 (2 min) ⭐ KEY MOMENT

**Say:**
> "Now I upload the PDF. Here's the important part - **the system doesn't make you wait for OCR**. I'll upload the file and immediately advance to the next step while OCR processes in the background. This is how modern UX works."

**Do:**
1. **Wizard Step 2 appears instantly**
2. Click "Select PDF" or drag-drop a sample PDF
3. File selected, **immediately click "Upload"**
4. Watch Step 3 load **INSTANTLY** (even if OCR is still processing)

**Point out:**
> "Notice how we're already on Step 3 while the OCR is working in the background. This non-blocking architecture is what makes the demo smooth and the user experience excellent. If OCR takes 30 seconds, we don't care - the user has moved on."

**Say:** "Modern apps don't block on long operations."

### Step 5: Review OCR Results - STEP 3 (1 min)

**Say:**
> "The system is extracting text from the PDF using OCR. I can see it's processing. I can review the text that was extracted, and if I need to, I can make edits before submission."

**Do:**
1. Wait for OCR to show "Completed" or a placeholder
2. Show the text area where extracted text appears
3. Point out "You can edit this text if needed"
4. Don't make edits (save time)
5. Click "Continue"

**Key message:** User has full control even if OCR is imperfect

### Step 6: Final Submission - STEP 4 (1 min)

**Say:**
> "Now I confirm everything looks good and submit for admin review. Once submitted, the admin team gets notified and the work enters the review queue."

**Do:**
1. **Wizard Step 4 appears instantly**
2. Review the info shown
3. Click "Submit for Admin Review"
4. Success message appears
5. **Auto-redirects to dashboard** ← Point out the smooth flow!

**Say:** "And we're back to the dashboard. The submission is now pending admin review."

---

## 👨‍💼 ADMIN FLOW (3 minutes)

### Step 1: Login as Admin (1 min)

**Say:**
> "Now let's switch to the admin view. Administrators see pending submissions that need review."

**Do:**
1. Click logout
2. Login as admin account
3. Dashboard loads to `/admin/dashboard`

**Point out:** Different interface for admin, tailored to their role

### Step 2: View Pending Submissions (1 min)

**Say:**
> "The admin dashboard shows all submissions pending review. I can see the status, who submitted it, and when. Let me click on one to review it."

**Do:**
1. Point to the pending submissions list
2. Click on a submission
3. Show the review interface

**Key message:** Admins have all information needed to make decisions

### Step 3: Admin Actions (1 min)

**Say:**
> "Here the admin can approve, reject, or return for revisions. The system keeps a record of all actions, maintains audit trails, and ensures academic integrity."

**Do:**
1. Point out the action buttons
2. Show admin remarks field
3. Go back to submissions list

**Key message:** Structured workflow, accountability

---

## 👨‍🏫 ADVISER FLOW (2 minutes)

### Step 1: Login as Adviser (1 min)

**Say:**
> "Advisers have a read-only view. They can see approved capstones but can't modify them. This role separation ensures proper access control."

**Do:**
1. Logout
2. Login as adviser
3. Show read-only dashboard

**Point out:** Clean interface, focused on what advisers need

### Step 2: Browse Capstones (1 min)

**Say:**
> "Advisers can browse all approved capstones in the repository and search by topic, year, category, or tags."

**Do:**
1. Show the approved capstones list
2. Demonstrate search/filter (if time)
3. Click on a capstone to view details

**Key message:** Repository is searchable and accessible

---

## 🎯 CLOSING REMARKS (1 minute)

**Say:**
> "So to recap:
>
> - **Students** submit work through a guided wizard that doesn't block on long operations
> - **Admins** have a clear queue of submissions to review
> - **Advisers** can search and browse the repository
> - The whole system is built on Supabase for security and scalability
> - Data is automatically archived and made searchable
>
> This is a production-ready system that could be deployed tomorrow. The architecture is solid, the UX is modern, and most importantly - **it's reliable and predictable**."

**Thank you!**

---

## ⏱️ TIMING GUIDE

| Section | Time | Cumulative |
|---------|------|-----------|
| Intro | 1 min | 1 min |
| Student Login | 1 min | 2 min |
| Student Dashboard | 1 min | 3 min |
| Submission Step 1 | 2 min | 5 min |
| Upload/OCR Step 2-3 | 2 min | 7 min |
| Submit Step 4 | 1 min | 8 min |
| Admin Flow | 3 min | 11 min |
| Adviser Flow | 2 min | 13 min |
| Closing | 1 min | 14 min |
| **BUFFER** | **1 min** | **15 min** |

---

## 🎬 Pro Tips

1. **Speak slowly** - You know the system, audience doesn't
2. **Point at screen** - Help people follow along
3. **Pause after key moments** - Let it sink in
4. **Don't rush** - Demo is better than speed
5. **If something goes wrong** - Say "Let me try that again" and move on
6. **Highlight the OCR** - It's your star feature
7. **Show role separation** - Different views = security
8. **End strong** - "Production ready, deployed tomorrow"

---

## 🆘 Quick Fixes If Needed

| Issue | Solution |
|-------|----------|
| Page won't load | Go back, try again |
| Stuck spinner | Wait 6s (auto-clears), or refresh |
| OCR taking forever | That's OK! Show it's background |
| Error message | Say "Let me try that again" |
| Typo in form | Leave it, doesn't affect demo |
| Can't find button | Use keyboard (Tab key) or say "One moment" |

---

## ✨ Remember

You've engineered a **production-grade system**. It's stable, predictable, and reliable. 

**The demo will go smoothly because you've frozen everything and handled edge cases.**

Go get 'em! 🚀
