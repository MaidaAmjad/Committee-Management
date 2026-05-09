# 🚀 How to Run the Committee Management Project

## Quick Start (3 Steps)

### Step 1: Install Dependencies (if needed)
```bash
cd "committee_management_hub/Committee Module/committee-module"
npm install
```

### Step 2: Configure Supabase (Required)
Create or update your Supabase configuration file:

**File:** `src/environments/environment.ts`

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'YOUR_SUPABASE_URL',
  supabaseKey: 'YOUR_SUPABASE_ANON_KEY'
};
```

**File:** `src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,
  supabaseUrl: 'YOUR_SUPABASE_URL',
  supabaseKey: 'YOUR_SUPABASE_ANON_KEY'
};
```

### Step 3: Run the Development Server
```bash
npm start
```

The application will be available at: **http://localhost:4200**

---

## 📋 Detailed Setup Instructions

### Prerequisites

#### 1. Node.js and npm
- **Node.js:** Version 18.x or higher
- **npm:** Version 9.x or higher

**Check if installed:**
```bash
node --version
npm --version
```

**Install if needed:**
- Download from: https://nodejs.org/
- Choose LTS (Long Term Support) version

#### 2. Angular CLI (Optional but Recommended)
```bash
npm install -g @angular/cli
```

**Verify installation:**
```bash
ng version
```

#### 3. Supabase Account
- Sign up at: https://supabase.com
- Create a new project
- Get your project URL and anon key

---

## 🔧 Project Setup

### 1. Navigate to Project Directory
```bash
cd "committee_management_hub/Committee Module/committee-module"
```

### 2. Install Dependencies
```bash
npm install
```

This will install:
- Angular 21.2.0
- Supabase JS Client
- Tailwind CSS
- RxJS
- And all other dependencies

**Expected output:**
```
added XXX packages in XXs
```

### 3. Configure Environment Variables

#### Create Environment Files
The project needs environment configuration files:

**Development Environment:**
```bash
# Create file: src/environments/environment.ts
```

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-anon-key-here'
};
```

**Production Environment:**
```bash
# Create file: src/environments/environment.prod.ts
```

```typescript
export const environment = {
  production: true,
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-anon-key-here'
};
```

#### Get Supabase Credentials
1. Go to your Supabase project dashboard
2. Click on "Settings" → "API"
3. Copy:
   - **Project URL** → Use as `supabaseUrl`
   - **anon public key** → Use as `supabaseKey`

### 4. Run Database Migration

Before running the app, set up the database:

1. Open Supabase SQL Editor
2. Copy content from: `database-migrations/winner-selection-system.sql`
3. Paste and execute in SQL Editor

**This creates:**
- `winner_selections` table
- Updates `committees` table
- Creates RLS policies
- Creates helper functions

---

## 🎯 Running the Application

### Development Server
```bash
npm start
```

**Or with Angular CLI:**
```bash
ng serve
```

**Options:**
```bash
# Run on specific port
npm start -- --port 4300

# Open browser automatically
npm start -- --open

# Run with specific configuration
npm start -- --configuration development
```

**Access the app:**
- URL: http://localhost:4200
- The app will automatically reload when you make changes

### Production Build
```bash
npm run build
```

**Output:**
- Built files in: `dist/committee-module/browser/`
- Optimized for production
- Minified and tree-shaken

### Watch Mode (Development)
```bash
npm run watch
```

Continuously builds the project when files change.

### Run Tests
```bash
npm test
```

Runs unit tests using Karma and Jasmine.

---

## 🌐 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start development server on port 4200 |
| `npm run build` | Build for production |
| `npm run watch` | Build in watch mode |
| `npm test` | Run unit tests |
| `npm run ng` | Run Angular CLI commands |

---

## 🔍 Verify Installation

### 1. Check Dependencies
```bash
npm list --depth=0
```

Should show all installed packages.

### 2. Check Angular Version
```bash
npx ng version
```

Should show Angular 21.2.0.

### 3. Check TypeScript
```bash
npx tsc --version
```

Should show TypeScript 5.9.x.

---

## 🐛 Troubleshooting

### Issue 1: "ng: command not found"
**Solution:**
```bash
# Use npx instead
npx ng serve

# Or install Angular CLI globally
npm install -g @angular/cli
```

### Issue 2: Port 4200 already in use
**Solution:**
```bash
# Use different port
npm start -- --port 4300
```

### Issue 3: Module not found errors
**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue 4: Supabase connection errors
**Solution:**
1. Check environment files exist
2. Verify Supabase URL and key are correct
3. Check Supabase project is active
4. Verify RLS policies are enabled

### Issue 5: Build errors
**Solution:**
```bash
# Clear Angular cache
rm -rf .angular

# Rebuild
npm run build
```

---

## 📱 Access the Application

### Default URLs
- **Development:** http://localhost:4200
- **Production:** (depends on your hosting)

### Available Routes
- `/login` - User login
- `/signup` - User registration
- `/dashboard` - User dashboard
- `/browse` - Browse committees
- `/create-committee` - Create new committee
- `/my-committees` - User's committees
- `/committee-detail/:id` - Committee details
- `/winner-management/:id` - Winner management (admin)
- `/payments` - Payment management
- And more...

---

## 🎨 Development Tips

### 1. Hot Reload
The development server supports hot reload. Changes to:
- TypeScript files
- HTML templates
- SCSS/CSS files
- Will automatically refresh the browser

### 2. Browser DevTools
- Open Chrome DevTools (F12)
- Check Console for errors
- Use Network tab to debug API calls
- Use Angular DevTools extension

### 3. VS Code Extensions (Recommended)
- Angular Language Service
- Prettier - Code formatter
- ESLint
- Tailwind CSS IntelliSense
- Angular Snippets

### 4. Debugging
```typescript
// Add breakpoints in VS Code
// Or use console.log
console.log('Debug:', variable);
```

---

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Hosting

#### Vercel
```bash
npm install -g vercel
vercel
```

#### Netlify
```bash
npm install -g netlify-cli
netlify deploy
```

#### Firebase Hosting
```bash
npm install -g firebase-tools
firebase init
firebase deploy
```

#### Manual Deployment
1. Build the project: `npm run build`
2. Upload `dist/committee-module/browser/` to your server
3. Configure server to serve `index.html` for all routes

---

## 📊 Project Structure

```
committee-module/
├── src/
│   ├── app/
│   │   ├── core/              # Services
│   │   ├── pages/             # Page components
│   │   ├── shared/            # Shared components
│   │   ├── app.routes.ts      # Routes
│   │   └── app.ts             # Root component
│   ├── environments/          # Environment configs
│   ├── index.html             # Main HTML
│   ├── main.ts                # Bootstrap
│   └── styles.css             # Global styles
├── database-migrations/       # SQL migrations
├── node_modules/              # Dependencies
├── angular.json               # Angular config
├── package.json               # npm config
├── tailwind.config.js         # Tailwind config
└── tsconfig.json              # TypeScript config
```

---

## 🔐 Environment Setup Checklist

- [ ] Node.js installed (v18+)
- [ ] npm installed (v9+)
- [ ] Project dependencies installed (`npm install`)
- [ ] Supabase account created
- [ ] Supabase project created
- [ ] Environment files configured
- [ ] Database migration executed
- [ ] Development server running
- [ ] Application accessible at localhost:4200

---

## 📚 Next Steps

After running the project:

1. **Test the Winner Selection System:**
   - Read: `WINNER-SELECTION-QUICKSTART.md`
   - Create a test committee
   - Select a winner

2. **Explore the Application:**
   - Create user account
   - Browse committees
   - Create a committee
   - Manage members

3. **Review Documentation:**
   - `WINNER-SELECTION-README.md` - Complete docs
   - `TESTING-GUIDE.md` - Testing instructions
   - `SYSTEM-ARCHITECTURE.md` - Architecture

---

## 💡 Quick Commands Reference

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Check for errors
npx ng lint

# Format code
npx prettier --write "src/**/*.{ts,html,scss}"

# Clear cache
rm -rf .angular node_modules
npm install
```

---

## 🎯 Common Development Workflow

### 1. Start Development
```bash
cd "committee_management_hub/Committee Module/committee-module"
npm start
```

### 2. Make Changes
- Edit files in `src/app/`
- Save files
- Browser auto-refreshes

### 3. Test Changes
- Check browser console
- Test functionality
- Run unit tests if needed

### 4. Commit Changes
```bash
git add .
git commit -m "Your message"
git push
```

---

## 🌟 Success Indicators

### Application is Running Successfully When:
✅ No errors in terminal  
✅ Browser opens to http://localhost:4200  
✅ Login page displays correctly  
✅ No console errors in browser DevTools  
✅ Supabase connection working  
✅ Navigation works  

---

## 📞 Need Help?

### Resources
- **Angular Docs:** https://angular.dev
- **Supabase Docs:** https://supabase.com/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Project Docs:** See `DOCUMENTATION-INDEX.md`

### Common Issues
- Check `TESTING-GUIDE.md` for troubleshooting
- Review `WINNER-SELECTION-README.md` for features
- See `SYSTEM-ARCHITECTURE.md` for architecture

---

**You're all set!** 🎉

Run `npm start` and start developing!
