# Local Network Server Setup

This app now runs as a LOCAL SERVER on your PC. All your coins, profiles, and loadouts store on your PC, and people on your WiFi can see everything.

## Step 1: Install Node.js

1. Go to https://nodejs.org/
2. Download and install the **LTS version**
3. After install, open PowerShell and verify:
```powershell
node --version
npm --version
```

## Step 2: Install Dependencies

In PowerShell, navigate to your project folder and run:
```powershell
cd C:\Users\USER\Desktop\Collection_site
npm install
```

This installs: express, sqlite3, cors, body-parser

## Step 3: Start the Server

```powershell
npm start
```

You should see:
```
✓ Server running on http://localhost:3000
✓ Access from other devices at: http://<YOUR-PC-IP>:3000
```

## Step 4: Find Your PC IP

In PowerShell, run:
```powershell
ipconfig
```

Look for **IPv4 Address** (usually something like `192.168.1.100` or `192.168.0.50`)

## Step 5: Access from Your PC

Open browser: http://localhost:3000

## Step 6: Access from Other Devices on Your WiFi

On another phone/laptop connected to the same WiFi:
- Open browser: `http://<YOUR-PC-IP>:3000`
- Example: `http://192.168.1.100:3000`

## Step 7: Test

1. From Device A (your PC): Sign up with email, create a loadout
2. From Device B (phone): Open same URL, sign up with different email, go to Loadouts
3. You should see Device A's loadout
4. Both can send trade requests to each other

## Troubleshooting

**"Can't find from other device":**
- Make sure both devices are on **same WiFi**
- Check Personal Firewall: allow port 3000 (or disable firewall temporarily)
- Replace `<YOUR-PC-IP>` with the correct IP from ipconfig

**Server won't start:**
- `npm install` first
- Make sure Node.js is installed: `node --version`
- Check for errors in terminal

**Database not persisting:**
- The database file `app.db` is in your project folder
- All data saves there permanently
- Check file permissions if needed

## Keeping Server Running

- The server runs in the terminal window
- Close terminal = server stops
- To keep it running 24/7, use:
  - **Task Scheduler** (Windows)
  - Or a service like **PM2**: `npm install -g pm2` then `pm2 start server.js`
