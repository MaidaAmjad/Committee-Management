# ⚡ Quick Start Guide

## 🚀 Running the Project (Right Now!)

### The Server is Starting...
The development server is currently building. This may take 1-2 minutes on first run.

### What's Happening:
```
✓ Installing dependencies
✓ Compiling TypeScript
✓ Building Angular application
⏳ Starting development server...
```

### Once Ready:
You'll see a message like:
```
✔ Browser application bundle generation complete.
✔ Built successfully!

Local:   http://localhost:4200/
```

### Access the Application:
Open your browser and go to: **http://localhost:4200**

---

## 📋 Quick Commands

### Start Development Server
```bash
cd "committee_management_hub/Committee Module/committee-module"
npm start
```

### Stop Development Server
Press `Ctrl + C` in the terminal

### Restart Server
```bash
# Stop with Ctrl + C, then:
npm start
```

---

## 🎯 First Time Setup (One-Time Only)

### 1. Install Dependencies (if needed)
```bash
npm install
```

### 2. Configure Supabase
Edit these files with your Supabase credentials:
- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'YOUR_SUPABASE_URL',
  supabaseKey: 'YOUR_SUPABASE_ANON_KEY'
};
```

### 3. Run Database Migration
1. Open Supabase SQL Editor
2. Execute: `database-migrations/winner-selection-system.sql`

---

## 🌐 Available URLs

Once the server is running:

| URL | Description |
|-----|-------------|
| http://localhost:4200 | Main application |
| http://localhost:4200/login | Login page |
| http://localhost:4200/signup | Sign up page |
| http://localhost:4200/dashboard | User dashboard |
| http://localhost:4200/browse | Browse committees |
| http://localhost:4200/create-committee | Create committee |

---

## ✅ Verify It's Working

### 1. Check Terminal
Look for:
```
✔ Built successfully!
Local: http://localhost:4200/
```

### 2. Open Browser
Navigate to: http://localhost:4200

### 3. Check for Errors
- Open Browser DevTools (F12)
- Check Console tab
- Should see no red errors

---

## 🐛 Quick Troubleshooting

### Server Won't Start
```bash
# Clear cache and restart
rm -rf .angular node_modules
npm install
npm start
```

### Port 4200 Already in Use
```bash
# Use different port
npm start -- --port 4300
```

### Supabase Connection Error
1. Check `src/environments/environment.ts`
2. Verify Supabase URL and key
3. Ensure Supabase project is active

---

## 📱 What to Do Next

### 1. Test the Application
- Create a user account
- Browse committees
- Create a test committee

### 2. Test Winner Selection
- Create committee with distribution method
- Add members
- Select a winner

### 3. Explore Features
- User dashboard
- Committee management
- Payment methods
- Winner announcements

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| `HOW-TO-RUN.md` | Complete setup guide |
| `WINNER-SELECTION-QUICKSTART.md` | Winner system setup |
| `WINNER-SELECTION-README.md` | Complete documentation |
| `TESTING-GUIDE.md` | Testing instructions |

---

## 💡 Development Tips

### Auto-Reload
The server automatically reloads when you save files.

### View Changes
1. Edit files in `src/app/`
2. Save
3. Browser refreshes automatically

### Debug
- Use Chrome DevTools (F12)
- Check Console for errors
- Use Network tab for API calls

---

## 🎉 You're Ready!

The development server is running. Once you see the success message, open:

**http://localhost:4200**

Happy coding! 🚀

---

## 📞 Need Help?

- **Full Guide:** See `HOW-TO-RUN.md`
- **Winner System:** See `WINNER-SELECTION-QUICKSTART.md`
- **All Docs:** See `DOCUMENTATION-INDEX.md`
