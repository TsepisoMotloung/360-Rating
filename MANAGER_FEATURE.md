# 360° Rating System - Manager User Type Implementation

## Overview

This project now includes a **Manager** user type in addition to the existing Admin and Rater roles. Managers can create and manage rating assignments for their team members, providing a middle layer of control between Admins and Raters.

## New Features

### 1. Manager User Type
- **Role-based access control**: Users can now be Admins, Managers, or Raters
- **Database schema**: New `Manager` table stores manager information
- **Manager assignments**: Separate assignment tracking for manager-created assignments
- **Manager responses**: Dedicated table for manager rating submissions

### 2. Manager Portal (`/manager`)
- **View assignments**: Managers can see all assignments they've created
- **Import assignments**: Bulk import ratings via JSON format
- **Submit ratings**: Fill out rating forms for assignments
- **Progress tracking**: Real-time progress indicator for completion status
- **Comments**: Add feedback comments to ratings

### 3. Admin Manager Management (`/admin/managers`)
- **Add managers**: Create new manager accounts via admin panel
- **Edit managers**: Update manager details (first name, last name)
- **Activate/Deactivate**: Toggle manager status
- **Delete managers**: Remove manager accounts
- **View all managers**: List of all managers with their details

### 4. Enhanced UI/UX
- **Navigation component**: Improved header with role-based styling
- **Better layout**: Consistent design across all pages
- **Responsive design**: Mobile-friendly interface for all roles
- **Status badges**: Clear visual indicators for completion status
- **Error handling**: User-friendly error pages

## Database Schema Changes

### New Models

#### Manager
```prisma
model Manager {
  id          Int          
  email       String       @unique
  firstName   String?      
  lastName    String?      
  isActive    Boolean      @default(true)
  createdBy   String?
  dateCreated DateTime     @default(now())
  assignments ManagerAssignment[]
}
```

#### ManagerAssignment
```prisma
model ManagerAssignment {
  id             Int          
  managerId      Int          
  ratingPeriodId Int          
  raterUserId    Int          
  raterEmail     String       
  rateeUserId    Int          
  rateeEmail     String       
  isCompleted    Boolean      @default(false)
  dateCompleted  DateTime?    
  createdDate    DateTime     @default(now())
  manager        Manager      @relation(...)
  period         RatingPeriod @relation(...)
  responses      ManagerResponse[]
}
```

#### ManagerResponse
```prisma
model ManagerResponse {
  id           Int          
  assignmentId Int          
  categoryId   Int          
  ratingValue  Int          
  comment      String?      
  updatedDate  DateTime     @default(now())
  assignment   ManagerAssignment @relation(...)
  category     RatingCategory    @relation(...)
}
```

## API Endpoints

### Manager Management (Admin)
- **GET** `/api/admin/managers` - List all managers
- **POST** `/api/admin/managers` - Create new manager
- **PUT** `/api/admin/managers` - Update manager details
- **DELETE** `/api/admin/managers` - Delete manager

### Manager Assignments
- **GET** `/api/manager/assignments` - Get manager's assignments
- **POST** `/api/manager/assignments` - Create bulk assignments
- **POST** `/api/manager/rating` - Submit rating for assignment

## User Flow

### For Admins:
1. Go to Admin Dashboard
2. Click "Manage Managers"
3. Add new managers by email
4. Manage existing managers (activate/deactivate/delete)

### For Managers:
1. Login with manager account
2. Redirected to Manager Portal (`/manager`)
3. Import assignments via JSON or admin pre-configuration
4. View list of assignments
5. Fill out rating forms
6. Submit ratings
7. Track progress with visual indicator

### For Raters:
1. Unchanged workflow
2. Still access via `/rater` portal
3. Complete ratings as usual

## Authentication & Authorization

- **Role Detection**: `validateUser()` function checks database for manager status
- **Manager-only routes**: API endpoints verify `isManager` flag
- **Data isolation**: Managers only see their own assignments
- **Automatic routing**: Users redirected to appropriate portal based on role

## Configuration

### Environment Variables
No new environment variables required. Uses existing database connection.

### Migration Steps
1. Generate Prisma client: `npm run prisma:generate`
2. Create migration: `npm run prisma:create -- add-manager-support`
3. Deploy migration: `npm run prisma:deploy`

## File Structure

```
app/
├── manager/
│   └── page.tsx              # Manager portal
├── admin/
│   ├── managers/
│   │   ├── page.tsx          # Managers list page
│   │   └── ManagersClient.tsx # Managers management UI
├── api/
│   ├── admin/
│   │   └── managers/
│   │       └── route.ts      # Manager CRUD API
│   └── manager/
│       ├── assignments/
│       │   └── route.ts      # Manager assignments API
│       └── rating/
│           └── route.ts      # Submit rating API
components/
├── Navigation.tsx            # Improved navigation component
├── Accordion.tsx             # Enhanced with subtitle support
└── RatingScale.tsx          # Star rating component

lib/
└── auth.ts                   # Updated with manager validation
```

## Testing Checklist

- [ ] Admin can add new managers
- [ ] Manager account is marked as active in database
- [ ] Manager can login and see portal
- [ ] Manager can import assignments
- [ ] Manager can view their assignments
- [ ] Manager can submit ratings
- [ ] Only manager's own assignments are visible
- [ ] Admin can deactivate managers
- [ ] Navigation shows correct role badge
- [ ] UI is responsive on mobile

## Future Enhancements

1. **Manager Reports**: Add analytics for manager-created assignments
2. **Assignment Templates**: Pre-save common assignment configurations
3. **Batch Operations**: Bulk edit/activate managers
4. **Email Notifications**: Send notifications when managers are added
5. **Manager Dashboards**: Custom analytics for managers
6. **Export Functionality**: Export manager-specific reports

## Security Considerations

- Manager email is unique in database
- Manager validation on all protected endpoints
- Role-based access control prevents unauthorized access
- Rate limiting recommended for API endpoints
- Audit logging recommended for manager creation/deletion

## Troubleshooting

### Manager not seeing assignments
- Verify manager email matches exactly (case-insensitive)
- Check manager `isActive` flag is true
- Verify active rating period exists
- Check database for ManagerAssignment records

### Assignment import failing
- Verify JSON format with `raterEmail` and `rateeEmail` fields
- Ensure emails match existing users
- Check that manager account exists and is active
- Verify active rating period is configured

### Authentication issues
- Clear browser cookies/session
- Verify user record exists in `tblUser`
- Check manager record in `Manager` table
- Review server logs for validation errors
