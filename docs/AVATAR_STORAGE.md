# Avatar Storage with Cloudinary

## Overview
Avatar storage has been migrated from local filesystem to **Cloudinary**, a cloud-based image management service. This provides persistent, scalable, and optimized image storage suitable for production on Vercel.

---

## Why Cloudinary?

### Problems with Local Filesystem
- ❌ **Ephemeral on Vercel** - Files lost on every redeployment
- ❌ **No scalability** - Only works on single instance
- ❌ **Bandwidth waste** - Served from Vercel (expensive)
- ❌ **No optimization** - Images not compressed
- ❌ **File management** - Manual cleanup needed

### Cloudinary Benefits
- ✅ **Persistent storage** - Works locally and production identically
- ✅ **Global CDN** - Fast delivery worldwide
- ✅ **Auto-optimization** - Images automatically resized/compressed
- ✅ **Free tier generous** - 10GB/month, unlimited bandwidth
- ✅ **Smart cropping** - Face detection for avatars

---

## Setup (Local Development)

### 1. Create Cloudinary Account
1. Go to https://cloudinary.com
2. Sign up for **Free account**
3. Copy credentials from dashboard:
   - Cloud Name
   - API Key
   - API Secret (Settings → API Keys)

### 2. Add to `.env`
```env
CLOUDINARY_CLOUD_NAME=your_value
CLOUDINARY_API_KEY=your_value
CLOUDINARY_API_SECRET=your_value
```

### 3. Start Server
```bash
npm run dev
```

### 4. Test Upload
- Go to `/updateUser`
- Select image and upload
- Verify avatar displays on profile

---

## How It Works

```
User selects image
    ↓
File sent to /api/fileUpload/uploadAvatar
    ↓
Multer receives to memory buffer
    ↓
Stream uploaded to Cloudinary
    ↓
Cloudinary optimizes:
  - Resize to 300x300
  - Auto quality adjustment
  - Format conversion (WebP if supported)
  - Smart crop on faces
    ↓
Returns HTTPS CDN URL
    ↓
URL saved to MongoDB User.avatar
    ↓
Frontend displays via CDN
```

---

## Technical Details

### File Location: `routes/avatar.js`

**Upload Endpoint:** `POST /api/fileUpload/uploadAvatar`
- Requires JWT authentication
- Accepts multipart form-data with `avatar` field
- File size limit: 5MB
- Supported formats: JPEG, PNG, WebP

**Cloudinary Configuration:**
```javascript
{
    folder: 'chat-app/avatars',      // Organized folder
    public_id: `avatar_${userId}`,   // Unique per user
    overwrite: true,                 // Replace old avatar
    quality: 'auto',                 // Intelligent compression
    fetch_format: 'auto',            // Browser-optimal format
    width: 300,
    height: 300,
    crop: 'fill',
    gravity: 'face'                  // Smart crop on faces
}
```

---

## Response Format

**Success (200):**
```json
{
  "avatar": "https://res.cloudinary.com/YOUR_CLOUD/image/upload/...",
  "message": "Avatar uploaded successfully"
}
```

**Error (400):**
```json
{
  "message": "No file selected!"
}
```

**Error (500):**
```json
{
  "message": "Failed to upload avatar"
}
```

---

## Frontend Integration

No changes needed! Frontend already works because:
- API endpoint unchanged
- Returns URL in same format
- Profile.js displays whatever URL is returned
- UpdateUser.js sends to correct endpoint

Example frontend code (already working):
```javascript
// Save avatar URL from server response
user.avatar = responseData.avatar;

// Display in profile
document.getElementById('profile-avatar').src = user.avatar;
```

---

## Cloudinary Dashboard

### View Uploaded Avatars
1. Log in to https://cloudinary.com/console
2. Media Library tab
3. Navigate to `chat-app/avatars` folder
4. See all uploaded avatar images
5. Get URLs, view transformations, delete if needed

### URL Examples
- **Original:** `https://res.cloudinary.com/YOUR_CLOUD/image/upload/avatar_userid`
- **Thumbnail:** `https://res.cloudinary.com/YOUR_CLOUD/image/upload/w_100/avatar_userid`
- **Optimized:** `https://res.cloudinary.com/YOUR_CLOUD/image/upload/q_auto,f_auto/avatar_userid`

---

## Production Deployment (Vercel)

1. Add environment variables to Vercel project:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
2. Redeploy
3. Avatar uploads work identically to local dev

---

## Free Tier Limits

- **Storage:** 10GB/month
- **Bandwidth:** Unlimited
- **API Rate:** 100-500 requests/hour
- **Transformations:** Unlimited

**For this app:** 10GB ≈ 2000 avatars @ 5MB each

---

## Migration from Filesystem

If you had local avatars before, they're now in `/uploads/avatars/` folder. You can safely delete this folder:

```bash
rm -r uploads/
```

Or keep it for historical reference. The app won't use it anymore.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No file selected" | User didn't select file in form |
| "500 Server error" | Check Cloudinary env vars are set correctly |
| "File too large" | Image > 5MB - compress before uploading |
| "Invalid format" | Use JPEG, PNG, or WebP format |
| Avatar not showing | Check user.avatar has valid URL in database |
| Cloudinary errors | Verify API key/secret in dashboard |

---

## Environment Variables

See `.env.example` for template. Cloudinary section:
```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Get from: https://cloudinary.com/console/settings/api-keys

---

## References

- [Cloudinary Dashboard](https://cloudinary.com/console)
- [Image Transformation API](https://cloudinary.com/documentation/image_transformation_reference)
- [Node.js SDK](https://github.com/cloudinary/cloudinary_npm)

---

**Status:** ✅ Active - Cloudinary integration ready for local and production use
