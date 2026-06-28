# Avatar Storage with Cloudinary

## Overview
Avatar storage uses Cloudinary instead of the local filesystem. That keeps uploads persistent, scalable, and optimized for delivery in production.

## Why Cloudinary

Local files are a poor fit for production because they are:
- easy to lose on redeploy or restart
- tied to one machine
- served without image optimization
- harder to manage over time

Cloudinary gives:
- persistent storage
- global CDN delivery
- automatic optimization
- face-aware cropping for avatars

## Setup

### 1. Create a Cloudinary account
Go to https://cloudinary.com and create an account.

### 2. Add environment variables
```env
CLOUDINARY_CLOUD_NAME=your_value
CLOUDINARY_API_KEY=your_value
CLOUDINARY_API_SECRET=your_value
```

### 3. Start the app
```bash
npm run dev
```

### 4. Test upload
- Open `/profile`
- Upload an image
- Confirm the avatar appears on the profile page

## Flow

1. User selects an image.
2. The browser sends it to `/api/uploads/avatar`.
3. Multer receives the file in memory.
4. The server streams it to Cloudinary.
5. Cloudinary returns a secure image URL.
6. The URL is saved to MongoDB on the user record.
7. The frontend renders the returned URL.

## Endpoint

`POST /api/uploads/avatar`

Requirements:
- JWT authentication
- multipart form-data with an `avatar` field
- file size up to 5MB
- JPEG, PNG, or WebP

## Production

Add the Cloudinary environment variables to the hosting platform, then redeploy.
The upload flow should behave the same as in local development.

## Troubleshooting

- `No file selected` - the form did not send a file
- `File too large` - the image exceeds 5MB
- `Invalid format` - use JPEG, PNG, or WebP
- `Avatar not showing` - check the stored URL in MongoDB
- `Cloudinary errors` - verify the API credentials
