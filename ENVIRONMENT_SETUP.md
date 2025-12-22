# Environment Configuration Guide

## 📁 Environment Files

This project uses different environment configurations for development and production:

### Files Created:
- **`.env`** - Default configuration (currently set to development)
- **`.env.development`** - Local development configuration
- **`.env.production`** - Production server configuration

---

## 🚀 Usage

### **For Development (Local)**
```bash
# Option 1: Use default .env (already configured for dev)
npm start

# Option 2: Explicitly specify development
NODE_ENV=development node server.js
```

### **For Production**
```bash
# Option 1: Copy production config to .env
cp .env.production .env
npm start

# Option 2: Specify production environment
NODE_ENV=production node server.js

# Option 3: Use cross-env package
npm install -D cross-env
cross-env NODE_ENV=production node server.js
```

---

## ⚙️ Configuration Details

### **Development Environment** (`.env.development`)
```
PORT=3000
API_BASE_URL=http://localhost:3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4200,http://localhost:5173
```
- Local database
- Debug logging
- Mock email
- Multiple localhost origins for frontend dev

### **Production Environment** (`.env.production`)
```
PORT=4201
API_BASE_URL=http://tamminademoapps.com:9295
NODE_ENV=production
ALLOWED_ORIGINS=http://localhost:4201,http://30.0.0.128:4201,http://tamminademoapps.com:9295
```
- Production database
- Info level logging
- Real SMTP email
- Multiple production origins
- Rate limiting enabled

---

## 📝 Before Deploying to Production

### **Important: Update These Values**

1. **JWT Secret** (`.env.production`)
   ```env
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```
   Generate a strong secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Database Credentials**
   ```env
   DB_HOST=your-production-db-host
   DB_USER=your-db-user
   DB_PASSWORD=your-secure-password
   DB_NAME=hrms_db_new
   ```

3. **Email Configuration**
   ```env
   EMAIL_ENABLED=true
   SMTP_HOST=smtp.gmail.com
   SMTP_USER=your-email@example.com
   SMTP_PASS=your-app-specific-password
   ```

---

## 🔒 Security Notes

- ✅ `.env.development` - Can be committed (contains no secrets)
- ⚠️ `.env.production` - **NEVER commit** (add to .gitignore)
- ⚠️ `.env` - **NEVER commit** (add to .gitignore)

### Update `.gitignore`:
```gitignore
# Environment files
.env
.env.production
.env.local
```

---

## 🛠️ Package.json Scripts (Recommended)

Add these to your `package.json`:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "NODE_ENV=development nodemon server.js",
    "prod": "NODE_ENV=production node server.js",
    "start:dev": "node -r dotenv/config server.js dotenv_config_path=.env.development",
    "start:prod": "node -r dotenv/config server.js dotenv_config_path=.env.production"
  }
}
```

Then run:
```bash
npm run dev      # Development
npm run prod     # Production
```

---

## 🌐 CORS Configuration

### Development
- `http://localhost:3000` - API server
- `http://localhost:4200` - Angular frontend
- `http://localhost:5173` - Vite/React frontend

### Production
- `http://localhost:4201` - Local production testing
- `http://30.0.0.128:4201` - Internal IP access
- `http://tamminademoapps.com:9295` - Public domain

---

## 📊 Environment Variables Reference

| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `PORT` | 3000 | 4201 | Server port |
| `NODE_ENV` | development | production | Environment mode |
| `DB_HOST` | localhost | localhost | Database host |
| `DB_USER` | root | root | Database user |
| `DB_PASSWORD` | root | **secure** | Database password |
| `DB_NAME` | hrms_db_new | hrms_db_new | Database name |
| `JWT_SECRET` | abc123xyz456 | **change-this** | JWT signing key |
| `API_BASE_URL` | http://localhost:3000 | http://tamminademoapps.com:9295 | API base URL |
| `ALLOWED_ORIGINS` | localhost:3000,4200 | Multiple production URLs | CORS origins |
| `EMAIL_ENABLED` | false | true | Enable email sending |
| `LOG_LEVEL` | debug | info | Logging verbosity |

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to database"
- Check `DB_HOST`, `DB_USER`, `DB_PASSWORD` in your `.env` file
- Ensure MySQL is running

### Issue: "CORS error"
- Add your frontend URL to `ALLOWED_ORIGINS`
- Restart the server after changing `.env`

### Issue: "JWT token invalid"
- Ensure `JWT_SECRET` is the same across restarts
- Use a consistent secret in production

---

## 📦 Loading Environment Files

The app automatically loads `.env` file. To use specific environment files:

```javascript
// In your server.js or app.js
require('dotenv').config({
  path: process.env.NODE_ENV === 'production' 
    ? '.env.production' 
    : '.env.development'
});
```

Or install `dotenv-cli`:
```bash
npm install -D dotenv-cli
npx dotenv -e .env.production -- node server.js
```

---

## ✅ Quick Start Checklist

### Development
- [ ] Copy `.env.development` to `.env` (or use as-is)
- [ ] Run `npm install`
- [ ] Run `npm start` or `npm run dev`
- [ ] Access: http://localhost:3000

### Production
- [ ] Copy `.env.production` to `.env`
- [ ] Update `JWT_SECRET` with strong secret
- [ ] Update database credentials
- [ ] Update email configuration
- [ ] Test with `NODE_ENV=production npm start`
- [ ] Access: http://tamminademoapps.com:9295

---

**Need Help?** Check the main README.md or contact the development team.
