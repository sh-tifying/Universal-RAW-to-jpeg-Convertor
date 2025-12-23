from flask import Flask, request, send_file
from flask_cors import CORS
import rawpy
import imageio
import io
import os
import gc # Garbage Collector to free RAM immediately

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

    try:
        print(f"Processing: {file.filename}")
        
        # Read file into memory
        file_bytes = file.read()
        
        with rawpy.imread(io.BytesIO(file_bytes)) as raw:
            
            # STRATEGY 1: Try to extract the Embedded JPEG (Instant & Low RAM)
            try:
                thumb = raw.extract_thumb()
                if thumb.format == rawpy.ThumbFormat.JPEG:
                    print("Method: Extracted Embedded JPEG (Fast)")
                    return send_file(
                        io.BytesIO(thumb.data),
                        mimetype='image/jpeg',
                        as_attachment=True,
                        download_name=f"{os.path.splitext(file.filename)[0]}.jpg"
                    )
            except Exception as e:
                print(f"No embedded thumbnail found, falling back to processing: {e}")

            # STRATEGY 2: Fallback to Processing (if no thumbnail)
            # half_size=True is MANDATORY for free servers
            print("Method: Raw Processing (Slower)")
            rgb = raw.postprocess(
                use_camera_wb=True, 
                bright=1.0, 
                user_sat=None,
                half_size=True 
            )
            
            img_io = io.BytesIO()
            imageio.imsave(img_io, rgb, format='jpeg', quality=90)
            img_io.seek(0)
            
            # Clean up memory explicitly
            del rgb
            del raw
            gc.collect()
            
            return send_file(img_io, mimetype='image/jpeg', as_attachment=True, download_name='converted.jpg')

    except Exception as e:
        print(f"CRASH ERROR: {e}")
        return str(e), 500
    finally:
        # Final cleanup ensures server doesn't hold onto the file
        file.close()
        gc.collect()

if __name__ == '__main__':
    app.run(port=5000, debug=True)