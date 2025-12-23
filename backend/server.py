from flask import Flask, request, send_file
from flask_cors import CORS
import rawpy
import imageio
import io
import os

app = Flask(__name__)
CORS(app)  # Allow React to talk to this server

# List of common RAW extensions (just for validation, rawpy supports more)
SUPPORTED_EXTENSIONS = {
    '.cr2', '.cr3', '.nef', '.arw', '.dng', '.raf', '.orf', '.rw2', '.pef', '.srw'
}

def is_raw_file(filename):
    """Check if the file extension is a known RAW format."""
    ext = os.path.splitext(filename)[1].lower()
    return ext in SUPPORTED_EXTENSIONS

@app.route('/convert', methods=['POST'])
def convert_image():
    if 'file' not in request.files:
        return "No file part", 400
    
    file = request.files['file']
    
    if file.filename == '':
        return "No selected file", 400

    # Optional: You can skip this check if you want to force rawpy to try EVERYTHING
    if not is_raw_file(file.filename):
        return f"File type '{file.filename}' might not be supported.", 400

    try:
        print(f"Processing: {file.filename}") # Log what's happening

        # 1. Read the RAW file from memory
        with rawpy.imread(file.stream) as raw:
            # 2. Convert to RGB
            # use_camera_wb=True: Uses the White Balance set in the camera
            # no_auto_bright=False: Automatically adjusts brightness (good for generic RAWs)
            rgb = raw.postprocess(
                use_camera_wb=True, 
                bright=1.0, 
                user_sat=None
            )
            
        # 3. Save to a memory buffer as JPEG
        img_io = io.BytesIO()
        imageio.imsave(img_io, rgb, format='jpeg', quality=90)
        img_io.seek(0)
        
        return send_file(img_io, mimetype='image/jpeg', as_attachment=True, download_name='converted.jpg')

    except rawpy.LibRawError as e:
        print(f"LibRaw Error: {e}")
        return f"Could not decode RAW file: {file.filename}", 500
    except Exception as e:
        print(f"General Error: {e}")
        return str(e), 500

if __name__ == '__main__':
    # Increase max upload size to 100MB (RAW files are huge)
    app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024 
    app.run(port=5000, debug=True)