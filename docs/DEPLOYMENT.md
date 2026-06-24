# Deployment Guide - Vercel

This guide covers deploying the chat app to **Vercel**.

---

## Prerequisites

- [ ] GitHub account with repo pushed
- [ ] Vercel account (free tier)
- [ ] MongoDB Atlas connection string
- [ ] Cloudinary credentials
- [ ] JWT secret generated

---

## Environment Variables

Add to Vercel project settings:

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=your_strong_random_secret_here

# MongoDB
USER=your_mongodb_user
PASSWORD=your_mongodb_password
DB=your_database_name
APP_NAME=chat-app
MONGODB_URI=mongodb+srv://USERNAME_PLACEHOLDER:PASSWORD_PLACEHOLDER@cluster.mongodb.net/DATABASE_PLACEHOLDER?appName=APP_NAME_PLACEHOLDER

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

```

---

## Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Connect to Vercel
1. Go to https://vercel.com/import
2. Select GitHub repo
3. Configure build settings (auto-detected):
   - Framework: Node.js
   - Root Directory: ./
   - Build: None (already configured)
   - Output: None (server runs directly)

### 3. Add Environment Variables
1. Project Settings → Environment Variables
2. Add all variables from above
3. Save

### 4. Deploy
Click "Deploy" button

**First deploy takes 1-2 minutes**

---

## Post-Deployment Verification

1. **Test Landing Page**
   - Visit your Vercel URL
   - Should load landing page

2. **Test Registration**
   - Create new account
   - Should redirect to dashboard

3. **Test Avatar Upload**
   - Go to `/updateUser`
   - Upload avatar
   - Should appear in Cloudinary dashboard
   - Avatar shows on profile

4. **Test WebSocket**
   - Create/join room
   - Send message
   - Should appear in real-time

5. **Check Logs**
   - Vercel Dashboard → Logs
   - Look for MongoDB/Cloudinary connection messages
   - No errors expected

---

## Common Issues

### MongoDB Connection Fails
- Check credentials in env vars
- Whitelist Vercel IPs in MongoDB Atlas (0.0.0.0/0)
- Test with `node testConn.js` locally first

### Cloudinary Upload Fails
- Verify env vars are set
- Regenerate API key if needed
- Check API key has upload permission

### WebSocket Not Working
- Vercel supports Socket.io
- Check /socket.io path in client
- Verify JWT in cookie is present

### Static Files Not Loading
- Check `/public` folder is tracked in git
- Verify `app.use('/public', express.static('public'))`
- CSS/JS should load from `/public` path

---

## Scaling Considerations

### Current Setup
- Works on single Vercel instance
- Cloudinary handles image storage
- MongoDB handles data
- Free tier sufficient for small/medium apps

### When to Upgrade
- 1000+ concurrent users → need serverless functions
- High message volume → consider caching layer
- Lots of avatars → Cloudinary paid plan

---

## Redeploy

To redeploy changes:
```bash
git push origin main  # Automatically triggers Vercel redeploy
```

---

## Monitoring

### Vercel Dashboard
- Deployments tab → view build/runtime logs
- Analytics tab → see performance metrics
- Environment tab → update variables without redeploying

### MongoDB Atlas
- Metrics tab → connection monitoring
- Activity Feed → database operations
- Alerts tab → set up notifications

### Cloudinary Dashboard
- Media Library → uploaded files
- Usage tab → storage/bandwidth metrics
- Settings → API rate limits

---

## Troubleshooting Checklist

- [ ] All env vars added to Vercel
- [ ] GitHub repo is public or connected
- [ ] `vercel.json` exists in root
- [ ] MongoDB IP whitelist includes 0.0.0.0/0
- [ ] Cloudinary credentials are correct
- [ ] `.env.example` is NOT in gitignore (template safe)
- [ ] Logs show no connection errors
- [ ] Test endpoints manually from browser

---

## Additional Resources

- [Vercel Docs](https://vercel.com/docs)
- [Node.js on Vercel](https://vercel.com/docs/concepts/functions/serverless-functions/node.js)
- [MongoDB Atlas Whitelist](https://docs.atlas.mongodb.com/security/ip-access-list/)
- [Cloudinary API Keys](https://cloudinary.com/console/settings/api-keys)

---

**Next:** Once deployed, features can be added and redeployed with `git push origin main`
