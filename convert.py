import rawpy
import imageio
import os
import glob

def convert_all_cr3():
    # Automatically find all .CR3 files in the current folder
    files = glob.glob("*.CR3")
    
    if not files:
        print("No .CR3 files found! Make sure this script is in the same folder as the photos.")
        return

    print(f"Found {len(files)} photos to convert...")

    for file_name in files:
        try:
            print(f"Processing {file_name}...")
            with rawpy.imread(file_name) as raw:
                # Postprocess with camera white balance
                rgb = raw.postprocess(use_camera_wb=True)
                
                # Create output filename (change extension to .jpg)
                output_name = os.path.splitext(file_name)[0] + ".jpg"
                
                # Save as JPEG
                imageio.imsave(output_name, rgb, quality=90)
                print(f"Saved: {output_name}")
                
        except Exception as e:
            print(f"Error converting {file_name}: {e}")

    print("conversion complete!")

    # Keep window open so you can read the result
    input("Press Enter to close...")

if __name__ == "__main__":
    convert_all_cr3()