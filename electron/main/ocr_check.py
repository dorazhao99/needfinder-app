print("ocr_check.py loaded")
import os
from pathlib import Path
import certifi
import ssl
import re
import warnings
from sensitive_domains import SENSITIVE_DOMAINS
import argparse
# Suppress PyTorch pin_memory warning on MPS (Apple Silicon)
warnings.filterwarnings('ignore', message='.*pin_memory.*MPS.*', category=UserWarning)

# Configure SSL to use certifi's certificate bundle
# This fixes SSL certificate verification errors on macOS
os.environ['SSL_CERT_FILE'] = certifi.where()
os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()

# Create SSL context with certifi certificates for urllib
def create_ssl_context():
    """Create SSL context using certifi's certificate bundle."""
    context = ssl.create_default_context()
    context.load_verify_locations(certifi.where())
    return context

ssl._create_default_https_context = create_ssl_context

import easyocr

# Common image extensions
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'}

# Initialize EasyOCR reader (lazy initialization - models downloaded on first use)
_reader = None

def _get_reader():
    """Get or initialize the EasyOCR reader."""
    global _reader
    if _reader is None:
        print("Initializing EasyOCR reader (this may take a moment on first run)...")
        _reader = easyocr.Reader(['en'])  # Support English by default
    return _reader

def regex_check(text: str) -> bool:
    for domain in SENSITIVE_DOMAINS:
        if re.search(domain, text):
            return True
    return False

def ocr_check(file_dir: str) -> bool:
    """
    Process all images in a directory using OCR.
    
    Args:
        file_dir: Directory path containing images to process
        
    Returns:
        bool: True if at least one image was successfully processed, False otherwise
    """
    if not os.path.exists(file_dir):
        print(f"Directory does not exist: {file_dir}")
        return False
    
    if not os.path.isdir(file_dir):
        print(f"Path is not a directory: {file_dir}")
        return False
    
    # Find all image files in the directory
    image_files = []
    for ext in IMAGE_EXTENSIONS:
        image_files.extend(Path(file_dir).glob(f"*{ext}"))
        image_files.extend(Path(file_dir).glob(f"*{ext.upper()}"))
    
    if not image_files:
        print(f"No image files found in directory: {file_dir}")
        return False
    
    print(f"Found {len(image_files)} image file(s) to process")
    
    # Initialize EasyOCR reader
    reader = _get_reader()
    
    # Process each image with OCR
    del_files = []
    for img_path in image_files:
        try:
            # Perform OCR using EasyOCR
            # EasyOCR returns a list of tuples: (bbox, text, confidence)
            results = reader.readtext(str(img_path))
            
            if results:
                # Combine all detected text
                all_text = []
                for (_, text, _) in results:
                    all_text.append(text)
                
                combined_text = " ".join(all_text)
                if regex_check(combined_text):
                    del_files.append(img_path.name)
            
        except Exception as e:
            print(f"Error processing {img_path.name}: {e}")
            continue
    print(f"del_files: {del_files}")
    for file in del_files:
        os.remove(os.path.join(file_dir, file))
    
    return len(del_files)

def main():
    parser = argparse.ArgumentParser(description='Check for sensitive domains in images')
    parser.add_argument('--file-dir', type=str, required=True, help='Directory to store screenshots', default="~/.cache/recordr/screenshots")
    args = parser.parse_args()
    ocr_check(args.file_dir)

if __name__ == "__main__":
    main()