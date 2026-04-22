import os
import subprocess
import datetime

def capture_image():
    """
    Captures a single photo from the connected webcam using fswebcam.
    Generates a filename based on the current system time.
    Saves the image to /home/admin/PlantPhotos/.
    """
    # Target directory for photos
    # Using the absolute path /home/admin/ is standard for the 'admin' user on Pi
    target_dir = "/home/admin/PlantPhotos/"
    
    # Ensure the directory exists
    if not os.path.exists(target_dir):
        try:
            os.makedirs(target_dir)
            print(f"Created directory: {target_dir}")
        except Exception as e:
            print(f"Failed to create directory {target_dir}: {e}")
            return None

    # Generate timestamp in yyyy-mm-dd-hh-mm format
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d-%H-%M")
    filename = f"{timestamp}.jpg"
    
    # Define the full path
    filepath = os.path.join(target_dir, filename)

    print(f"Attempting to capture: {filename}")

    try:
        # Tuning parameters for fswebcam:
        # -r: resolution (800x800)
        # --no-banner: removes the timestamp text overlay
        # -S 20: Skips first 20 frames to allow auto-exposure to stabilize
        # --set brightness=40%: Darkens the image to fix overexposure
        # --set contrast=60%: Increases contrast for better AI analysis
        
        subprocess.run([
            "fswebcam", 
            "-r", "800x800", 
            "--no-banner",
            "-S", "20",
            "--set", "brightness=20%",
            "--set", "contrast=60%",
            filepath
        ], check=True)
        
        print(f"Success! Photo saved at: {filepath}")
        return filepath

    except subprocess.CalledProcessError as e:
        print(f"Error: Failed to capture image. Check webcam connection.")
        print(f"Technical details: {e}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None

if __name__ == "__main__":
    capture_image()
