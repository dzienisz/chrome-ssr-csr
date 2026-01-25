# How to Use Claude Code for This Project

**Quick reference for continuing development with Claude Code**

---

## 🎯 When to Start New Chat vs Continue

### Continue This Chat If:
- ✅ It's within 1-2 weeks
- ✅ You're working on the same phase
- ✅ Following up on something we discussed
- ✅ Quick question or bug fix

**How:** Just click back into this conversation

### Start New Chat If:
- ✅ Starting a new phase (Phase 1 → Phase 2)
- ✅ It's been more than 2 weeks
- ✅ This chat is getting very long (slow responses)
- ✅ Working on completely different feature

**How:** Open Claude Code, start fresh, provide context (see below)

---

## 📝 How to Start a New Chat

### Template for New Sessions:

```
I'm working on the CSR vs SSR Detector Chrome extension.

**Current Status:**
- Version: [check manifest.json]
- Phase: [check TODO.md - e.g., "Phase 2: UI Revamp"]
- Last completed: [e.g., "Finished code refactor"]

**What I Need Help With:**
[Specific task - e.g., "I need to implement the settings page with dark mode toggle"]

**Context Files:**
- See PROGRESS.md for overall status
- See TODO.md for current checklist
- See V3_PLAN.md Phase [X] for detailed plan

**Ready to start!**
```

### Example:

```
I'm working on the CSR vs SSR Detector Chrome extension.

**Current Status:**
- Version: 3.0 (in development)
- Phase: Phase 2 - UI Revamp (Week 1)
- Last completed: Finished Phase 1 code refactor

**What I Need Help With:**
I need to create the options.html settings page with:
- History limit selector
- Dark mode toggle
- Save/load settings functionality

**Context Files:**
- PROGRESS.md shows I'm on track
- TODO.md says I should do this task now
- V3_PLAN.md Phase 2.1 has the details

**Ready to start!**
```

---

## 🗂️ Key Files to Reference

**Always mention these in new chats:**

### 1. **PROGRESS.md** - Overall project status
Shows what's done, what's next, timeline

### 2. **TODO.md** - Current week's tasks
Your immediate action items

### 3. **V3_PLAN.md** - Detailed implementation guide
Specific instructions for each phase

### 4. **ROADMAP.md** - Feature ideas
Long-term vision and plans

---

## 💡 Common Prompts

### Starting Work:

**Beginning a Phase:**
```
I'm ready to start Phase [X] of V3_PLAN.md. Let's work on [specific task].
```

**Continuing Work:**
```
I finished [previous task]. Next on TODO.md is [next task]. Let's continue.
```

**Stuck on Something:**
```
I'm working on [feature] and getting this error: [paste error].
Here's my code: [paste code]
```

### Asking for Help:

**Planning:**
```
Help me plan [feature]. Show me the architecture and steps.
```

**Coding:**
```
Let's implement [feature]. Guide me through it step by step.
```

**Reviewing:**
```
Review this code for [feature]. Any improvements?
```

**Debugging:**
```
This isn't working: [describe issue]. Help me debug it.
```

---

## 📅 Your Workflow

### Monday Morning (Start of Week):
1. Open `TODO.md`
2. See what phase/week you're in
3. Open Claude Code (continue or new chat)
4. Say: "Ready to work on [this week's tasks]"

### During Development:
1. Work on task
2. Ask Claude Code for help when stuck
3. Test your changes
4. Check off task in `TODO.md`

### Friday Evening (End of Week):
1. Update `TODO.md` checkboxes
2. Commit your work to git
3. Update `PROGRESS.md` if milestone reached
4. Plan Monday's first task

---

## 🔄 File System

**Your tracking files:**
```
chrome-ssr-csr/
├── TODO.md              ⭐ Check this weekly
├── PROGRESS.md          📊 Update after milestones
├── V3_PLAN.md          📖 Reference during work
├── ROADMAP.md          🗺️ Long-term vision
├── CHANGELOG.md        📝 Update on release
├── README.md           📚 Keep updated
└── calendar-reminders.ics  📅 Import to Google Calendar
```

---

## 📱 Google Calendar Setup

**Import reminders:**
1. Open `calendar-reminders.ics` in this folder
2. Go to Google Calendar
3. Click ⚙️ Settings → Import & export
4. Import `calendar-reminders.ics`
5. ✅ Done! You'll get reminders automatically

**Key dates imported:**
- Oct 21: Plan v3.0
- Oct 28: Start Phase 1 (Refactor)
- Nov 11: Start Phase 2 (UI Revamp)
- Nov 25: Start Phase 3 (Features)
- Dec 23: Release v3.0
- Every Monday: Weekly check-in reminder

---

## 🎯 Quick Commands

### Check Your Status:
```bash
cd /Users/home/Developer/chrome-ssr-csr
cat TODO.md | grep -A 5 "THIS WEEK"
```

### See Recent Progress:
```bash
git log --oneline -5
```

### Check Current Version:
```bash
cat manifest.json | grep version
```

### Open Key Files:
```bash
open TODO.md PROGRESS.md V3_PLAN.md
```

---

## ⚠️ Important Notes

### Don't Lose Context:
- Keep `TODO.md` updated
- Reference the right phase in `V3_PLAN.md`
- Mention what you've already completed

### Stay Organized:
- Work on one task at a time
- Test after each feature
- Commit frequently
- Update docs as you go

### Ask for Help:
- I'm here to help at every step!
- No question is too small
- Better to ask than get stuck

---

## 🎓 Learning Goals

Each phase teaches specific skills:

**Phase 1 (Refactor):**
- Code architecture
- Module organization
- Error handling patterns

**Phase 2 (UI Revamp):**
- Chrome options API
- Dark mode implementation
- CSS theming

**Phase 3 (Features):**
- Export APIs
- Performance APIs
- Web Vitals
- Data visualization

---

## ✅ Success Checklist

Before starting each session:
- [ ] Opened `TODO.md` to see current tasks
- [ ] Know which phase I'm in
- [ ] Have specific task to work on
- [ ] Ready to ask Claude Code for help

After each session:
- [ ] Checked off completed tasks in `TODO.md`
- [ ] Tested my changes
- [ ] Committed to git
- [ ] Know what's next

---

## 🎉 You've Got This!

**Remember:**
- Take it one task at a time
- It's okay to take breaks
- Learning is the goal, not speed
- I'll help you every step of the way

**Next reminder:** Oct 21, 2024 - Plan v3.0 features

**Enjoy the break until then!** 🚀
