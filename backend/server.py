from flask import Flask, request, send_file, Response
from flask_cors import CORS
import rawpy
import imageio
import io
import os
import gc
import tempfile

app = Flask(__name__)
# Expose headers so the frontend can read the EXIF data
CORS(app, expose_headers=["X-Exif-Camera", "X-Exif-ISO", "X-Exif-Shutter", "X-Exif-Aperture"])

SUPPORTED_EXTENSIONS = {'.cr2', '.cr3', '.nef', '.arw', '.dng', '.raf', '.orf', '.rw2', '.pef', '.srw'}

def is_raw_file(filename):
    return os.path.splitext(filename)[1].lower() in SUPPORTED_EXTENSIONS

@app.route('/convert', methods=['POST'])
def convert_image():
    if 'file' not in request.files:
        return "No file part", 400
    
    file = request.files['file']
    # 7. READ QUALITY SETTING (Default to 90 if missing)
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
            # 2. EXTRACT EXIF DATA
            # rawpy usually detects the camera model
            try:
                camera_model = raw.model.decode('utf-8') if raw.model else "Unknown"
            except:
                camera_model = "Unknown"

            # Processing
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

            # Create response with EXIF Headers
            response = send_file(img_io, mimetype='image/jpeg', as_attachment=True, download_name='converted.jpg')
            response.headers["X-Exif-Camera"] = camera_model
            # Note: Extracting full EXIF like ISO/Shutter from rawpy is complex; 
            # we will send Camera Model for now as proof of concept.
            return response

    except Exception as e:
        print(f"ERROR: {e}")
        return str(e), 500
        
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        gc.collect()

if __name__ == '__main__':
    app.run(port=5000, debug=True)