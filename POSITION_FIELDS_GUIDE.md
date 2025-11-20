# Position Fields Feature - Quick Reference

## What's New
Position tracking has been added to all assignment types, allowing you to capture and track the job positions of raters and ratees throughout the 360-degree rating system.

## Where to Use Positions

### 1. **Admin Dashboard** - Creating Assignments
- Navigate to: Admin → Manage Assignments → Add Assignment
- Fill in the new "Rater Position" and "Ratee Position" fields (optional)
- Examples: Manager, Developer, Coordinator, Analyst, etc.

### 2. **Manager Portal** - Importing Assignments
- Navigate to: Manager Portal → Import Assignments
- JSON format now supports position fields:
  ```json
  {
    "raterEmail": "john@company.com",
    "rateeEmail": "jane@company.com",
    "raterPosition": "Team Lead",
    "rateePosition": "Senior Developer"
  }
  ```

### 3. **Viewing Assignments**
- **Rater View**: See the ratee's position in the assignment header
- **Manager View**: See both rater and ratee positions in assignment headers

## Position Display Examples

### Rater Dashboard
```
Accordion Title: Jane Smith (jane@company.com)
Subtitle: Position: Senior Developer
```

### Manager Dashboard
```
Accordion Title: John Smith → Jane Smith
Subtitle: john@smith.com → jane@smith.com (Team Lead → Senior Developer)
```

### Admin Dashboard
```
- Rater: john@smith.com (Position: Team Lead)
- Ratee: jane@smith.com (Position: Senior Developer)
```

## Technical Implementation

### Database Tables Updated
- `tblRatingAssignment`: Added `RaterPosition`, `RateePosition` columns
- `tblManagerAssignment`: Added `RaterPosition`, `RateePosition` columns

### API Endpoints Updated
- `POST /api/admin/assignments`: Accept position parameters
- `POST /api/manager/assignments`: Accept position parameters
- `GET /api/admin/assignments`: Return position data
- `GET /api/manager/assignments`: Return position data
- `GET /api/rater/assignments`: Return position data

### UI Components Enhanced
- Admin assignments form: New position input fields
- Manager import modal: Position field examples in placeholder
- Rater dashboard: Position display in accordion subtitles
- Manager dashboard: Position display in accordion subtitles

## Key Features

✅ **Optional Fields**: Positions are optional - can leave blank
✅ **Backward Compatible**: Existing assignments without positions still work
✅ **Display Support**: Positions automatically display where applicable
✅ **Import Support**: Batch import assignments with positions
✅ **API Support**: All APIs fully support position data

## Next Steps

1. **Run Database Migration**:
   ```bash
   npx prisma migrate dev --name add_position_fields
   ```

2. **Test Position Functionality**:
   - Create an assignment with positions (Admin)
   - View it in Manager and Rater dashboards
   - Import assignments with positions

3. **Production Deployment**:
   - Deploy updated code
   - Run migration on production database
   - Verify existing data (positions will be NULL for old assignments)

## Troubleshooting

- **Positions not saving**: Ensure database migration has run
- **Positions not displaying**: Clear browser cache, refresh page
- **Import failing with positions**: Verify JSON format matches example
- **API errors**: Check that auth token is valid and user has permissions

## Position Field Specifications

| Field | Type | Max Length | Required | Example |
|-------|------|-----------|----------|---------|
| RaterPosition | VARCHAR | 100 | No | Senior Manager |
| RateePosition | VARCHAR | 100 | No | Team Lead |

## User Guide by Role

### Administrators
- Add positions when creating assignments
- Positions appear in assignment listings
- Use positions for reporting and analysis
- Can be left blank for flexibility

### Managers
- Add positions when importing assignments
- See positions for all assignments under their management
- Use positions to organize and understand rating relationships
- Positions help identify cross-hierarchical feedback

### Raters
- See the position of the person they're rating
- Context helps provide more relevant feedback
- Positions appear as read-only information in assignment headers

## Example Workflows

### Scenario 1: Peer Review with Positions
1. Admin creates assignment:
   - Rater: john@company.com (Manager)
   - Ratee: jane@company.com (Manager)
   - Relationship: Peer
2. System displays: "John (Manager) → Jane (Manager)"
3. Helps identify peer relationships at same level

### Scenario 2: Manager Rating Subordinate
1. Admin creates assignment:
   - Rater: supervisor@company.com (Director)
   - Ratee: employee@company.com (Analyst)
   - Relationship: Manager
2. System displays: "Supervisor (Director) → Employee (Analyst)"
3. Clearly shows hierarchical relationship

### Scenario 3: Direct Import with Positions
1. Manager imports batch JSON with positions:
   ```json
   [
     {"raterEmail": "...", "rateeEmail": "...", "raterPosition": "Senior Dev", "rateePosition": "Junior Dev"},
     {"raterEmail": "...", "rateeEmail": "...", "raterPosition": "Team Lead", "rateePosition": "Senior Dev"}
   ]
   ```
2. System stores all position data
3. All users see appropriate position information

---

**Status**: Feature ready for production deployment
**Documentation**: See FEATURE_UPDATE.md for technical details
