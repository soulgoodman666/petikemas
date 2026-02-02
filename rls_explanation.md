# Supabase Row Level Security (RLS) Policies

## Overview
Row Level Security (RLS) provides database-level access control that works regardless of frontend implementation.

## Security Model

### 1. Public Users (Guests)
- **Can**: Read file metadata (`SELECT` on files table)
- **Cannot**: Insert, update, or delete any records
- **Storage**: Can read/download files from storage bucket

### 2. Admin Users
- **Can**: All operations (SELECT, INSERT, UPDATE, DELETE)
- **Validation**: Must exist in `admins` table with `role = 'admin'`
- **Storage**: Full access to upload bucket

## Key Policies

### Files Table
```sql
-- Public read access
CREATE POLICY "Files table public read access" ON files
  FOR SELECT USING (true);

-- Admin-only write access
CREATE POLICY "Files table admin insert" ON files
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.email = auth.email() 
      AND admins.role = 'admin'
    )
  );
```

### Storage Bucket
```sql
-- Public read (downloads)
CREATE POLICY "Storage public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'uploads');

-- Admin-only write (uploads)
CREATE POLICY "Storage admin insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'uploads' AND
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.email = auth.email() 
      AND admins.role = 'admin'
    )
  );
```

## How RLS Protects the System

### 1. Database-Level Enforcement
- **Bypasses frontend**: Policies work regardless of client code
- **Direct API access**: Even direct database calls are restricted
- **Consistent security**: Same rules for all access methods

### 2. Admin Validation
- **Email verification**: Checks `auth.email()` against `admins` table
- **Role confirmation**: Ensures `role = 'admin'` in admins table
- **Real-time validation**: Every operation is checked

### 3. Public Access Control
- **Read-only access**: Guests can only view file metadata
- **No modification**: Cannot insert, update, or delete
- **Download access**: Can access public URLs for downloads

### 4. Storage Security
- **File protection**: Upload/delete requires admin validation
- **Public downloads**: Read access allowed for all users
- **Bucket isolation**: Policies scoped to specific bucket

## Implementation Notes

### Authentication Context
- `auth.role()`: Returns 'authenticated' for logged-in users
- `auth.email()`: User's email from Supabase Auth
- `auth.uid()`: User's unique ID

### Policy Evaluation
- **Permissive policies**: Allow access if ANY policy matches
- **Restrictive policies**: Deny access if ANY policy denies
- **Policy order**: Multiple policies can apply to same operation

### Performance Considerations
- **Subquery overhead**: Admin validation requires subquery
- **Caching**: Supabase caches policy results
- **Indexing**: Ensure `admins.email` is indexed

## Security Benefits

1. **Zero Trust**: No frontend security assumptions
2. **Defense in Depth**: Multiple layers of protection
3. **Audit Trail**: All access is logged and controlled
4. **Scalability**: Security scales with user base
5. **Compliance**: Data access is properly controlled

## Setup Instructions

1. Run `rls_policies.sql` for complete setup
2. Or run `rls_simple.sql` for simplified version
3. Verify policies with the included SELECT queries
4. Test with both admin and guest users

## Testing RLS

### Test Public Access
```sql
-- As guest (no auth token)
SELECT * FROM files; -- Should work
INSERT INTO files (...) VALUES (...); -- Should fail
```

### Test Admin Access
```sql
-- As admin (with auth token)
SELECT * FROM files; -- Should work
INSERT INTO files (...) VALUES (...); -- Should work
```

This RLS setup ensures robust, database-level security that protects your application regardless of frontend implementation.
