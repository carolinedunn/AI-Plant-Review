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
Takes a photo every 15 minutes during daylight hours.
```bash
*/15 7-18 * * * /usr/bin/python3 /home/admin/PlantPhotos/takephoto.py
```

### 2. Automatic AI Upload (Firebase Direct)
Sends the most recent photo directly to your Firestore database.

1. Create `upload.py`:
   ```bash
   nano /home/admin/PlantPhotos/upload.py
   ```
2. Paste the script below (Replace the placeholders with values from your `firebase-applet-config.json`):

```python
import base64
import requests
import os
import time

# --- CONFIGURATION (DO NOT SHARE PUBLICLY) ---
API_KEY = "<YOUR_WEB_API_KEY>"
PROJECT_ID = "<YOUR_PROJECT_ID>"
DB_ID = "<YOUR_FIRESTORE_DB_ID>"
SECRET = "<YOUR_UPLOAD_SECRET>"
IMAGE_DIR = "/home/admin/PlantPhotos"
# ---------------------

def get_latest_image():
    files = [os.path.join(IMAGE_DIR, f) for f in os.listdir(IMAGE_DIR) if f.endswith('.jpg')]
    return max(files, key=os.path.getctime) if files else None

latest = get_latest_image()
if not latest:
    print("No photos found.")
    exit()

with open(latest, "rb") as img_file:
    b64_string = base64.b64encode(img_file.read()).decode('utf-8')

url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/{DB_ID}/documents/snapshots?key={API_KEY}"
payload = {
    "fields": {
        "image": {"stringValue": b64_string},
        "timestamp": {"integerValue": str(int(time.time() * 1000))},
        "secret": {"stringValue": SECRET}
    }
}

response = requests.post(url, json=payload)
if response.status_code == 200:
    print(f"✅ Uploaded: {os.path.basename(latest)}")
else:
    print(f"❌ Error {response.status_code}: {response.text}")
```

3. Add to Crontab:
```bash
# Upload every 2 hours
0 7,9,11,13,15,17,19 * * * /usr/bin/python3 /home/admin/PlantPhotos/upload.py
```

### 3. Storage Maintenance (Cleanup)
Automatically deletes photos older than 2 days.
```bash
0 0 * * * find /home/admin/PlantPhotos/ -name "*.jpg" -type f -mtime +2 -delete
```

---