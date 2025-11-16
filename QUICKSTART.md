# 360° Rating System - Quick Setup Guide

## ⚡ Fast Track (15 minutes)

### Step 1: Extract & Install (3 min)
```bash
cd 360-rating-app
npm install
```

### Step 2: Configure Database (2 min)
Edit `.env.local`:
```env
DB_SERVER=your-server.database.windows.net
DB_DATABASE=YourDatabaseName
DB_USER=your-username
DB_PASSWORD=your-password
```

### Step 3: Initialize Database (5 min)
Open SQL Server Management Studio and execute:

1. **Create tables:** `database/init.sql`
2. **Import assignments:** `database/import-assignments.sql`

This imports 212 assignments from the Employee Rating Guide.

### Step 4: Start Application (1 min)
```bash
npm run dev
```

Application runs at: http://localhost:3000

### Step 5: Test Access (4 min)

**Test as Rater:**
```
http://localhost:3000?uid=kmoshoeshoe&email=kmoshoeshoe@alliance.co.ls
```

**Test as Admin:**
```
http://localhost:3000?uid=tmotloung&email=tmotloung@alliance.co.ls
```

---

## 📊 What's Already Configured

✅ **212 manager ratings** pre-imported from CSV
✅ **20+ managers** as ratees
✅ **5-15 raters** per manager
✅ **1 active period:** "Managers 360 Review 2024"
✅ **5 rating categories:** Customer, Accountability, Trust, Care, Innovation

---

## 🎯 Key Users from CSV

| Name | Email | Role |
|------|-------|------|
| **Thabiso Motloung** | tmotloung@alliance.co.ls | **Admin** (Business Intelligence Analyst) |
| Mochalo Mokoara | mokoaram@alliance.co.ls | Executive Assistant & BI |
| Kekeletso Moshoeshoe | kmoshoeshoe@alliance.co.ls | Head Sales & Distribution |
| Paballo Malehi | pmalehi@alliance.co.ls | Head Projects & Innovation |
| Likopo Tshepe | ltsephe@alliance.co.ls | Head Finance |
| Teboho Litaba | tlitaba@alliance.co.ls | Head Client Service |

---

## 🔧 Admin Functions

### Add More Assignments
```bash
POST /api/admin/assignments
{
  "uid": "2291",
  "email": "tmotloung@alliance.co.ls",
  "assignments": [
    {
      "periodId": 1,
      "raterUserId": "user1",
      "raterEmail": "user1@alliance.co.ls",
      "rateeUserId": "user2",
      "rateeEmail": "user2@alliance.co.ls"
    }
  ]
}
```

### Create New Period
```bash
POST /api/admin/periods
{
  "uid": "2291",
  "email": "tmotloung@alliance.co.ls",
  "periodName": "Q1 2025",
  "startDate": "2025-01-01",
  "endDate": "2025-03-31",
  "isActive": true
}
```

---

## 🚨 Common Issues

**"Unauthorized Access"**
→ User doesn't exist in `tblUser`. Verify UserID and Username match.

**"No active period"**
→ Run: `UPDATE tblRatingPeriod SET IsActive = 1 WHERE RatingPeriodID = 1;`

**"No assignments"**
→ Execute: `database/import-assignments.sql`

---

## 📁 Important Files

- `database/init.sql` - Create all tables
- `database/import-assignments.sql` - Import 212 assignments
- `database/assignments.json` - JSON format for API import
- `.env.local` - Database configuration
- `README.md` - Full documentation

---

## 🎨 UI Preview

**Rater Portal:**
- Accordion-style rating forms
- 1-5 star Likert scales
- Progress tracking
- Submit individually or bulk

**Admin Dashboard:**
- Real-time statistics
- Interactive charts
- Top/bottom performers
- Manage periods & assignments

---

## 📞 Support

**Admin:** tmotloung@alliance.co.ls

---

## ✅ Production Checklist

- [ ] Update `.env.local` → `.env.production`
- [ ] Use strong database password
- [ ] Enable HTTPS
- [ ] Set up database backups
- [ ] Test with 5-10 real users
- [ ] Configure CORS if embedding in iframe
- [ ] Monitor logs for errors
- [ ] Verify all 212 assignments loaded

---

**Total Setup Time: 15 minutes** ⏱️
