from flask import Flask, request, send_file
from flask_cors import CORS
import rawpy
import imageio
import io
import os
import gc
import tempfile
import exifread

app = Flask(__name__)
# Expose headers so the frontend can read the EXIF data
CORS(app, expose_headers=["X-Exif-Camera"])

SUPPORTED_EXTENSIONS = {'.cr2', '.cr3', '.nef', '.arw', '.dng', '.raf', '.orf', '.rw2', '.pef', '.srw'}

def get_camera_model(file_path, raw_obj):
    """
    Tries 3 methods to find the camera name:
    1. rawpy (Best for standard files)
    2. exifread (Best for TIFF-based RAWs)
    3. Brute Force (Reads the file header text directly)
    """
    
    # --- METHOD 1: Try rawpy ---
    try:
        if hasattr(raw_obj, 'model') and raw_obj.model:
            model = raw_obj.model.decode('utf-8').strip()
            if model and model.lower() != "unknown":
                print(f"✅ Found via rawpy: {model}")
                return model
    except Exception:
        pass

    # --- METHOD 2: Try exifread ---
    try:
        with open(file_path, 'rb') as f:
            tags = exifread.process_file(f, details=False)
            cam_model = str(tags.get('Image Model', '')).strip()
            if cam_model and cam_model != "None":
                print(f"✅ Found via exifread: {cam_model}")
                return cam_model
    except Exception:
        pass

    # --- METHOD 3: Brute Force Scanner (Last Resort) ---
    # Looks for brand names in the first 4KB of the file
    try:
        with open(file_path, 'rb') as f:
            # Read the file header as binary
            header_bytes = f.read(4096)
            # Convert to text, ignoring garbage binary characters
            text = header_bytes.decode('utf-8', errors='ignore')
            
            # Common brands to hunt for
            brands = ["Canon", "NIKON", "SONY", "FUJIFILM", "LEICA", "Panasonic", "OLYMPUS", "PENTAX", "HASSELBLAD"]
            
            for brand in brands:
                if brand in text:
                    # Find where the brand name starts
                    idx = text.find(brand)
                    # Grab the next 50 characters
                    snippet = text[idx:idx+50]
                    
                    # Clean it up: Stop reading at the first weird character
                    clean_name = ""
                    for char in snippet:
                        if char.isalnum() or char in " -_":
                            clean_name += char
                        else:
                            break # Stop at binary garbage
                    
                    clean_name = clean_name.strip()
                    if len(clean_name) > 3: # Avoid noise
                        print(f"✅ Found via Brute Force: {clean_name}")
                        return clean_name
    except Exception as e:
        print(f"⚠️ Brute force failed: {e}")

    return "Unknown Camera"

@app.route('/convert', methods=['POST'])
def convert_image():
    if 'file' not in request.files:
        return "No file part", 400
    
    file = request.files['file']
    quality = int(request.form.get('quality', 90))
    
    if file.filename == '':
        return "No selected file", 400

    temp_path = None
    try:
        # Save to disk temporarily
        file_ext = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp:
            file.save(temp.name)
            temp_path = temp.name
        
        with rawpy.imread(temp_path) as raw:
            # 1. EXTRACT METADATA (Now with 3 fallback methods)
            camera_model = get_camera_model(temp_path, raw)

            # 2. PROCESS IMAGE
            rgb = raw.postprocess(
                use_camera_wb=True, 
                bright=1.0, 
                user_sat=None,
                half_size=True 
            )
            
            img_io = io.BytesIO()
            imageio.imsave(img_io, rgb, format='jpeg', quality=quality)
            img_io.seek(0)
            
            del rgb
            del raw
            gc.collect()

            # 3. SEND RESPONSE
            response = send_file(img_io, mimetype='image/jpeg', as_attachment=True, download_name='converted.jpg')
            
            # Sanitize header to prevent crashes
            safe_header = camera_model.replace('\n', ' ').replace('\r', '')
            response.headers["X-Exif-Camera"] = safe_header
            
            return response

    except Exception as e:
        print(f"❌ Server Error: {e}")
        return str(e), 500
        
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        gc.collect()

if __name__ == '__main__':
    print("🚀 Server running... (Metadata Engine: Maximum Compatibility)")
    app.run(port=5000, debug=True)
    