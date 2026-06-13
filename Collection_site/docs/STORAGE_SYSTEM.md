# Storage Management System

Your app now has **automatic storage management** with a 10GB limit.

## How It Works

### Storage Tracking
- **Limit**: 10 GB total database size
- **Monitoring**: Real-time storage usage displayed in bottom-left widget
- **Updates**: Storage widget refreshes every 5 seconds
- **Database**: `app.db` file stores all users, loadouts, and trade requests

### Storage Widget Display

The bottom-left widget shows:
- **Used Storage**: How much space is currently used (e.g., "2.5 GB / 10 GB")
- **Percentage**: How full the storage is (0-100%)
- **Progress Bar**: Visual indicator (green → yellow → red as it fills up)
- **Warnings**: 
  - Yellow warning at 70% full
  - Red warning at 90% full
  - 🚫 "Full" at 100%

### Color Coding
- 🟢 **Green** (0-70%): Normal operation
- 🟡 **Yellow** (70-90%): Nearing limit, plan cleanup
- 🔴 **Red** (90-100%): Very full, uploads may fail soon
- 💀 **Black + Red Border** (100%): Full - no more uploads allowed

### Upload Behavior

**Before 10GB:**
- Users can upload loadout images
- Trade requests are recorded
- Profile pictures are stored
- All data persists

**At 10GB (Full):**
- ❌ **Upload blocked** with message: "🚫 Storage is full (10GB limit reached). No more uploads allowed."
- 📍 **New accounts** can still be created (minimal space)
- 📧 **Messages** (trade requests) can still be sent
- 🖼️ **Images** cannot be stored

### Freeing Up Storage

If storage is full, you can:
1. **Delete old loadouts** via database cleanup (manual)
2. **Delete inactive users** from Firebase Console or database
3. **Archive data** to external storage
4. **Upgrade PC storage** to rebuild larger database

### API Endpoints

**Get Storage Info:**
```
GET /api/storage
```

Response:
```json
{
  "usedBytes": 2147483648,
  "usedFormatted": "2.0 GB",
  "remainingBytes": 7516192768,
  "remainingFormatted": "7.0 GB",
  "maxBytes": 10737418240,
  "maxFormatted": "10 GB",
  "percentUsed": 20.0,
  "isFull": false,
  "canStore": true
}
```

### Storage Calculations

Each item takes approximately:
- **User account**: ~0.5 KB
- **Loadout image**: ~50-500 KB (depends on image size)
- **Trade request**: ~0.1 KB
- **Profile picture**: ~50-300 KB

### Example Scenarios

**Scenario 1: Normal Use**
- 100 users × 0.5 KB = 50 KB
- 500 loadout images × 100 KB avg = 50 MB
- Total: ~51 MB (0.05 GB) ✅ Plenty of room

**Scenario 2: Heavy Use**
- 10,000 users × 0.5 KB = 5 MB
- 50,000 loadout images × 150 KB avg = 7.5 GB
- Total: ~7.5 GB (still under 10 GB) ✅ Room for more

**Scenario 3: Maximum Capacity**
- ~65,000 loadout images × 150 KB avg = ~9.75 GB
- Plus users/requests/profiles ≈ 10 GB ⛔ Full

### Monitoring Storage

On any page with the Create or Loadouts sections, you'll see the storage widget in the bottom-left corner. It updates automatically without needing to refresh.

### Server-Side Monitoring

Check server terminal for database file size:
```powershell
(Get-Item C:\Users\USER\Desktop\Collection_site\app.db).Length | % { "$_ bytes = $([math]::Round($_/1GB, 2)) GB" }
```

Or use:
```powershell
ls -lh C:\Users\USER\Desktop\Collection_site\app.db
```
