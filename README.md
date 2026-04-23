# 🌿 AI Plant Review: Raspberry Pi Setup Guide

This guide contains the instructions, scripts, and configurations required to automate your Raspberry Pi plant monitoring station.

## 🛠 Prerequisites

### 1. Required Packages
Ensure your Raspberry Pi is up to date and has the necessary tools installed. We use `libcamera` for official Pi Cameras or `fswebcam` for USB webcams.

```bash
sudo apt-get update
sudo apt-get install curl coreutils fswebcam python3
```

### 2. Directory Structure
Ensure the storage directory exists where photos will be saved:
```bash
mkdir -p /home/admin/PlantPhotos
```

---

## 📸 Camera Script Setup (`takephoto.py`)

Create the Python script on your Raspberry Pi to handle the photo capture.

1. Create the file:
   ```bash
   nano /home/admin/PlantPhotos/takephoto.py
   ```
2. Paste the following code:
   ```python
   import os
   import time
   from datetime import datetime

   # Configuration
   SAVE_PATH = "/home/admin/PlantPhotos"
   
   # Ensure directory exists
   if not os.path.exists(SAVE_PATH):
       os.makedirs(SAVE_PATH)

   # Generate filename with timestamp
   timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")
   filename = f"{SAVE_PATH}/plant_{timestamp}.jpg"

   # Execute capture command
   # Option A: For official Raspberry Pi Camera Module
   # os.system(f"libcamera-still -o {filename} --nopreview --width 1280 --height 720")
   
   # Option B: For USB Webcams (using fswebcam)
   os.system(f"fswebcam -r 1280x720 --no-banner {filename}")

   print(f"Captured: {filename}")
   ```

---

## 📋 Crontab Configuration

To install these tasks, run `crontab -e` on your Raspberry Pi and paste the following lines at the bottom of the file.

### 1. Automated Photo Capture
Takes a high-resolution photo every 15 minutes during daylight hours (7:00 AM to 6:59 PM).
```bash
*/15 7-18 * * * /usr/bin/python3 /home/admin/PlantPhotos/takephoto.py
```

### 2. Automatic AI Upload
Finds the most recent photo and securely streams it to the **AI Plant Review** dashboard.

**Option: Every 2 hours (7:00 AM to 7:00 PM)**
```bash
0 7,9,11,13,15,17,19 * * * LATEST=$(ls -t /home/admin/PlantPhotos/*.jpg | head -1); { echo -n '{"secret": "Caroline", "image": "'; base64 -w 0 "$LATEST"; echo -n '"}'; } | curl -L -X POST https://ai-plant-review-789076151805.us-west1.run.app/api/upload-image -H "Content-Type: application/json" -d @-
```

### 3. Storage Maintenance (Cleanup)
Automatically deletes photos older than 2 days to prevent your SD card from filling up.
```bash
# Run cleanup once a day at midnight
0 0 * * * find /home/admin/PlantPhotos/ -name "*.jpg" -type f -mtime +2 -delete
```

---

## 🔐 Security Note
The upload command uses a secret token (`"secret": "Caroline"`). Ensure your Cloud Run environment variable `UPLOAD_SECRET` matches this value in the AI Studio settings.
