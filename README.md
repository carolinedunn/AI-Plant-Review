# 🌿 AI Plant Review: Raspberry Pi Setup Guide

This guide contains the `crontab` configurations required to automate your Raspberry Pi plant monitoring station. 

## 📸 Camera Script Setup (`takephoto.py`)

Create the Python script on your Raspberry Pi to handle the photo capture.

1. Create the file:
   ```bash
   nano /home/admin/PlantPhotos/takephoto.py
   ```
2. Paste the following code (Optimized for Raspberry Pi Camera Module):
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

   # Execute capture command (using libcamera for newer Pi OS)
   # If you are on an older OS, use 'raspistill -o' instead
   try:
       print(f"Capturing image: {filename}")
       os.system(f"libcamera-still -o {filename} --nopreview --width 1280 --height 720")
       print("Capture successful.")
   except Exception as e:
       print(f"Error capturing image: {e}")
   ```

## 📋 Crontab Configuration

To install these tasks, run `crontab -e` on your Raspberry Pi and paste the following lines at the bottom of the file.

### 1. Automated Photo Capture
Takes a high-resolution photo every 15 minutes during daylight hours (7:00 AM to 6:59 PM).
```bash
*/15 7-18 * * * /usr/bin/python3 /home/admin/PlantPhotos/takephoto.py
```

### 2. Automatic AI Upload
Finds the most recent photo and securely streams it to the **AI Plant Review** dashboard every 15 minutes.
```bash
*/15 * * * * LATEST=$(ls -t /home/admin/PlantPhotos/*.jpg | head -1); { echo -n '{"secret": "Caroline", "image": "'; base64 -w 0 "$LATEST"; echo -n '"}'; } | curl -L -X POST https://florapulse-iot-plant-care-789076151805.us-west1.run.app/api/upload-image -H "Content-Type: application/json" -d @-
```

### 3. Storage Maintenance (Cleanup)
Automatically deletes photos older than 2 days to prevent your SD card from filling up.
```bash
# Run cleanup once a day at midnight
0 0 * * * find /home/admin/PlantPhotos/ -name "*.jpg" -type f -mtime +2 -delete
```

---

## 🛠 Prerequisites

### Directory Structure
Ensure the storage directory exists:
```bash
mkdir -p /home/admin/PlantPhotos
```

### Required Packages
The upload command requires `curl` and `base64` (Standard on most Raspberry Pi OS versions).
```bash
sudo apt-get update
sudo apt-get install curl coreutils
```

## 🔐 Security Note
The upload command uses a secret token (`"secret": "secret-here"`). Ensure your Cloud Run environment variable `UPLOAD_SECRET` matches this value in the AI Studio settings.
