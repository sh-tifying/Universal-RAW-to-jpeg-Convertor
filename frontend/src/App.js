import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import toast, { Toaster } from 'react-hot-toast'; // #4 Toast Notifications
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider'; // #1 Slider
import './App.css'; 
import ParticlesBackground from './ParticlesBackground'; 

function App() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [convertedImages, setConvertedImages] = useState([]);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false); // #5 Drag Overlay
  
  // Settings State
  const [quality, setQuality] = useState(90); // #7 Quality
  const [theme, setTheme] = useState('dark'); // #8 Theme

  // 🔴 YOUR URL HERE
  const API_URL = "https://YOUR-APP-NAME.onrender.com/convert"; 

  // #8 Theme Toggle Logic
  useEffect(() => {
    document.body.className = theme; // Applies 'dark' or 'light' class to body
  }, [theme]);

  const toggleTheme = () => {
    setTheme(curr => curr === 'dark' ? 'light' : 'dark');
  };

  // #5 Drag & Drop Logic
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      handleFiles(event.target.files);
    }
  };

  const handleFiles = (files) => {
    setSelectedFiles(Array.from(files));
    setConvertedImages([]);
    setProgress(0);
    toast.success(`Selected ${files.length} files!`, { icon: '📁' });
  };

  const handleConvert = async () => {
    if (selectedFiles.length === 0) return;

    const toastId = toast.loading('Starting conversion...');
    setProgress(0);
    setConvertedImages([]);
    
    let errorCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("quality", quality); // #7 Send Quality Setting

      try {
        const response = await fetch(API_URL, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const newName = file.name.substring(0, file.name.lastIndexOf('.')) + ".jpg";

          // #2 Extract EXIF from Headers
          const cameraModel = response.headers.get("X-Exif-Camera") || "Unknown Camera";

          const newImageObj = {
            originalName: file.name,
            newName: newName,
            url: url,
            data: blob,
            exif: { camera: cameraModel }
          };

          setConvertedImages(prev => [...prev, newImageObj]);
          toast.success(`${newName} ready!`, { id: toastId }); // Update toast

        } else {
          errorCount++;
          toast.error(`Failed: ${file.name}`);
        }
      } catch (error) {
        console.error(error);
        errorCount++;
      }

      const currentPercent = Math.round(((i + 1) / selectedFiles.length) * 100);
      setProgress(currentPercent);
    }

    toast.dismiss(toastId);
    if (errorCount === 0) toast.success("All files converted successfully! 🎉");
    else toast.error(`Finished with ${errorCount} errors.`);
  };

  const downloadAll = () => {
    const zip = new JSZip();
    convertedImages.forEach((img) => {
      zip.file(img.newName, img.data);
    });
    zip.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, "converted_photos.zip");
    });
  };

  return (
    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} style={{minHeight: '100vh'}}>
      <Toaster position="top-right" /> {/* #4 Toast Container */}
      <ParticlesBackground />

      {/* #5 Drag Overlay */}
      {isDragging && (
        <div className="drag-overlay">
          <h1>📂 Drop files to start!</h1>
        </div>
      )}

      {/* #8 Theme Toggle Button */}
      <button className="theme-toggle" onClick={toggleTheme}>
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="app-container">
        
        <header className="header">
          <h1>RAW to JPEG</h1>
          <p className="subtitle">Pro Converter Suite</p>
        </header>

        {/* Upload Zone */}
        <div className="upload-zone">
          <input 
            type="file" 
            multiple 
            accept=".CR3, .CR2, .NEF, .ARW, .DNG" 
            onChange={handleFileChange} 
            className="file-input"
          />
          <div className="upload-content">
            <span className="upload-icon">⚡</span>
            <p className="upload-text">
              {selectedFiles.length > 0 
                ? <span>Selected {selectedFiles.length} files</span> 
                : "Drag & Drop or Click to Browse"}
            </p>
          </div>
        </div>

        {/* Controls: Quality & Buttons */}
        <div className="controls-row">
          
          {/* #7 Quality Selector */}
          <div className="quality-selector">
            <label>Quality:</label>
            <select value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="100">Lossless (100%)</option>
              <option value="90">High (90%)</option>
              <option value="75">Web (75%)</option>
            </select>
          </div>

          <div className="action-area">
            <button 
              className="btn btn-primary"
              onClick={handleConvert} 
              disabled={selectedFiles.length === 0}
            >
              START CONVERSION
            </button>
            {convertedImages.length > 0 && (
              <button className="btn btn-secondary" onClick={downloadAll}>
                DOWNLOAD ZIP
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {progress > 0 && progress < 100 && (
          <div className="progress-container">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        )}

        {/* Results Grid */}
        <div className="image-grid">
          {convertedImages.map((img, index) => (
            <div key={index} className="image-card">
              
              {/* #1 Before/After Slider (Simulated using same img for demo) */}
              <div className="slider-container">
                 <ReactCompareSlider
                  itemOne={<ReactCompareSliderImage src={img.url} alt="Original" style={{filter: 'grayscale(50%) brightness(0.8)'}} />} // Simulating 'Raw' look
                  itemTwo={<ReactCompareSliderImage src={img.url} alt="Processed" />} 
                />
                <div className="slider-label">Compare (Simulated)</div>
              </div>

              <div className="card-info">
                <div className="file-name">{img.newName}</div>
                {/* #2 EXIF Data Display */}
                <div className="exif-badge">📷 {img.exif.camera}</div>
                
                <a href={img.url} download={img.newName} style={{textDecoration: 'none'}}>
                  <button className="btn-download-mini">SAVE JPEG</button>
                </a>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default App;