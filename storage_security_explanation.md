# Supabase Storage Security Configuration

## Overview
Storage security complements database RLS by controlling file access at the storage level, ensuring files are protected regardless of how they're accessed.

## Bucket Configuration

### Public Bucket Setup
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true, -- Public bucket for downloads
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'application/pdf', ...]
);
```

### Key Settings
- **Public: `true`** - Allows public read access via signed URLs
- **File size limit: 10MB** - Prevents oversized uploads
- **Allowed MIME types** - Restricts file types for security
- **Bucket ID: `uploads`** - Unique identifier for policies

## Storage Policies

### 1. Public Read Access
```sql
CREATE POLICY "Public read access to uploads" ON storage.objects
  FOR SELECT USING (bucket_id = 'uploads');
```

**What it does:**
- Allows anyone to read/download files from the uploads bucket
- Enables public URL access for file downloads
- No authentication required for read operations

**Use cases:**
- Public file downloads
- Image display in web pages
- Document sharing

### 2. Admin-only Upload Access
```sql
CREATE POLICY "Admin upload access to uploads" ON storage.objects
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

**What it does:**
- Only authenticated admin users can upload files
- Validates admin status against `admins` table
- Checks bucket ID to prevent cross-bucket access

**Security checks:**
- User must be authenticated (`auth.role() = 'authenticated'`)
- User must exist in `admins` table
- User must have `role = 'admin'` in admins table

### 3. Admin-only Update Access
```sql
CREATE POLICY "Admin update access to uploads" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'uploads' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.email = auth.email() 
      AND admins.role = 'admin'
    )
  );
```

**What it does:**
- Only admin users can modify existing files
- Prevents unauthorized file modifications
- Maintains file integrity

### 4. Admin-only Delete Access
```sql
CREATE POLICY "Admin delete access to uploads" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'uploads' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.email = auth.email() 
      AND admins.role = 'admin'
    )
  );
```

**What it does:**
- Only admin users can delete files
- Prevents accidental or malicious file deletion
- Ensures proper file lifecycle management

## How This Prevents Abuse

### 1. Unauthorized Upload Prevention
**Problem:** Malicious users uploading harmful files
**Solution:** Admin-only upload policy with authentication check
**Result:** Only verified admins can upload files

### 2. File Size Abuse Prevention
**Problem:** Users uploading huge files to exhaust storage
**Solution:** 10MB file size limit at bucket level
**Result:** Automatically rejects oversized files

### 3. File Type Abuse Prevention
**Problem:** Users uploading executable files or malware
**Solution:** Allowed MIME types whitelist
**Result:** Only safe file types accepted

### 4. Unauthorized Deletion Prevention
**Problem:** Users deleting important files
**Solution:** Admin-only delete policy
**Result:** Only admins can remove files

### 5. Cross-Bucket Access Prevention
**Problem:** Users accessing files in other buckets
**Solution:** Bucket ID validation in all policies
**Result:** Policies scoped to specific bucket only

### 6. Direct API Abuse Prevention
**Problem:** Bypassing frontend to access storage directly
**Solution:** Storage policies work at database level
**Result:** All access methods protected

## Security Layers

### Layer 1: Bucket Configuration
- File size limits
- MIME type restrictions
- Public/private access settings

### Layer 2: Storage Policies
- Authentication requirements
- Admin validation
- Operation-specific controls

### Layer 3: Database RLS
- File metadata protection
- Admin role validation
- Audit trail

### Layer 4: Frontend Validation
- Client-side checks
- User interface restrictions
- Error handling

## Access Flow Examples

### Public User Download
1. User requests file URL
2. Storage policy allows read (public)
3. File returned via signed URL
4. No authentication required

### Admin User Upload
1. Admin authenticates with Supabase
2. Upload request includes auth token
3. Storage policy validates admin status
4. File uploaded if authorized
5. Metadata stored in database

### Unauthorized Upload Attempt
1. User tries to upload without auth
2. Storage policy rejects (no auth token)
3. Upload blocked at storage level
4. Error returned to client

## Configuration Benefits

### Security
- **Zero Trust**: All operations validated
- **Defense in Depth**: Multiple security layers
- **Audit Trail**: All access logged

### Performance
- **Policy Caching**: Rules cached for efficiency
- **Bucket Optimization**: Efficient file serving
- **CDN Integration**: Fast public access

### Scalability
- **User Growth**: Security scales with users
- **File Growth**: Efficient storage management
- **Role Management**: Easy to extend roles

## Setup Instructions

1. **Run the SQL script:**
   ```sql
   -- Execute storage_security.sql in Supabase SQL Editor
   ```

2. **Verify bucket setup:**
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'uploads';
   ```

3. **Test policies:**
   ```sql
   -- Test public read (should work)
   SELECT * FROM storage.objects WHERE bucket_id = 'uploads';
   
   -- Test upload without auth (should fail)
   -- Attempt upload via client without auth token
   ```

4. **Monitor storage:**
   - Check bucket usage in Supabase dashboard
   - Monitor policy violations in logs
   - Review file access patterns

This storage security configuration ensures robust file protection while maintaining public access for downloads.
