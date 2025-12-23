from flask import Flask, request, send_file
from flask_cors import CORS
import rawpy
import imageio
import io
import os
import gc
import tempfile

app = Flask(__name__)
CORS(app)

SUPPORTED_EXTENSIONS = {
    '.cr2', '.cr3', '.nef', '.arw', '.dng', '.raf', '.orf', '.rw2', '.pef', '.srw'
}

def is_raw_file(filename):
    ext = os.path.splitext(filename)[1].lower()
    return ext in SUPPORTED_EXTENSIONS

@app.route('/convert', methods=['POST'])
def convert_image():
    if 'file' not in request.files:
        return "No file part", 400
    
    file = request.files['file']
    
    if file.filename == '':
        return "No selected file", 400

    if not is_raw_file(file.filename):
        return f"File type '{file.filename}' might not be supported.", 400

    temp_path = None

    try:
        print(f"Processing: {file.filename}")
        
        # 1. SAVE TO DISK (Avoids RAM explosion)
        # We create a temp file on the hard drive
        file_ext = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp:
            file.save(temp.name)
            temp_path = temp.name
        
        # 2. Open from Disk
        with rawpy.imread(temp_path) as raw:
            
            # STRATEGY: Try Embedded JPEG first (Fastest)
            try:
                thumb = raw.extract_thumb()
                if thumb.format == rawpy.ThumbFormat.JPEG:
                    print("Success: Extracted Embedded JPEG")
                    return send_file(
                        io.BytesIO(thumb.data),
                        mimetype='image/jpeg',
                        as_attachment=True,
                        download_name=f"{os.path.splitext(file.filename)[0]}.jpg"
                    )
            except Exception as e:
                print(f"No thumbnail found: {e}")

            # FALLBACK: Half-size conversion
            print("Fallback: converting raw data...")
            rgb = raw.postprocess(
                use_camera_wb=True, 
                bright=1.0, 
                user_sat=None,
                half_size=True # Mandatory for free tier
            )
            
            img_io = io.BytesIO()
            imageio.imsave(img_io, rgb, format='jpeg', quality=90)
            img_io.seek(0)
            
            del rgb
            del raw
            gc.collect()
            
            return send_file(img_io, mimetype='image/jpeg', as_attachment=True, download_name='converted.jpg')

    except Exception as e:
        print(f"CRASH ERROR: {e}")
        return str(e), 500
        
    finally:
        # 3. CLEAN UP DISK
        # Explicitly delete the temp file to save space
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        gc.collect()

if __name__ == '__main__':
    app.run(port=5000, debug=True)