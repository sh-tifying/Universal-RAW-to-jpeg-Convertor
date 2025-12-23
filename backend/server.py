from flask import Flask, request, send_file
from flask_cors import CORS
import rawpy
import io
import os
import gc

app = Flask(__name__)
CORS(app)

# Increase Flask's internal limit to 200MB just to be safe
app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024 

@app.route('/convert', methods=['POST'])
def convert_image():
    if 'file' not in request.files:
        return "No file part", 400
    
    file = request.files['file']
    if file.filename == '':
        return "No selected file", 400

    try:
        print(f"Processing: {file.filename}")
        
        # Read file into memory (This is the only RAM usage)
        file_bytes = file.read()
        
        # Open the RAW container
        with rawpy.imread(io.BytesIO(file_bytes)) as raw:
            
            # Try to grab the embedded JPEG
            try:
                thumb = raw.extract_thumb()
            except Exception as e:
                # If we can't find a thumb, we ABORT. 
                # We do not try to convert, because that crashes the free server.
                print(f"Error extracting thumbnail: {e}")
                return "This RAW file does not have a compatible preview image.", 400

            if thumb.format == rawpy.ThumbFormat.JPEG:
                print("Success: Extracted Embedded JPEG")
                return send_file(
                    io.BytesIO(thumb.data),
                    mimetype='image/jpeg',
                    as_attachment=True,
                    download_name=f"{os.path.splitext(file.filename)[0]}.jpg"
                )
            else:
                return "Embedded preview is not a JPEG.", 400

    except Exception as e:
        print(f"CRASH ERROR: {e}")
        return f"Server Error: {str(e)}", 500
    finally:
        gc.collect()

if __name__ == '__main__':
    app.run(port=5000, debug=True)