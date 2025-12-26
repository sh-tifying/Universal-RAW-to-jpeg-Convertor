import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import toast, { Toaster } from 'react-hot-toast'; 
import './App.css'; 
import ParticlesBackground from './ParticlesBackground'; 

function App() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [convertedImages, setConvertedImages] = useState([]);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false); 
  const [quality, setQuality] = useState(90); 
  const [theme, setTheme] = useState('dark'); 
  //const API_URL = "https://your-production-api.com/convert";
  const API_URL = "http://127.0.0.1:5000/convert"; 

  useEffect(() => { document.body.className = theme; }, [theme]);
  const toggleTheme = () => setTheme(curr => curr === 'dark' ? 'light' : 'dark');

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
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
      formData.append("quality", quality); 

      try {
        const response = await fetch(API_URL, { method: "POST", body: formData });
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const newName = file.name.substring(0, file.name.lastIndexOf('.')) + ".jpg";
          const cameraModel = response.headers.get("X-Exif-Camera") || response.headers.get("x-exif-camera") || "Unknown Camera";

          setConvertedImages(prev => [...prev, {
            originalName: file.name, newName, url, data: blob, exif: { camera: cameraModel }
          }]);
          toast.success(`${newName} ready!`, { id: toastId }); 
        } else {
          errorCount++;
          toast.error(`Failed: ${file.name}`);
        }
      } catch (error) { console.error(error); errorCount++; }
      setProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
    }
    toast.dismiss(toastId);
    if (errorCount === 0) toast.success("Done! 🎉");
  };

  const downloadAll = () => {
    const zip = new JSZip();
    convertedImages.forEach((img) => zip.file(img.newName, img.data));
    zip.generateAsync({ type: "blob" }).then((content) => saveAs(content, "converted_photos.zip"));
  };

  return (
    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} style={{minHeight: '100vh'}}>
      <Toaster position="top-right" /> 
      <ParticlesBackground />
      {isDragging && <div className="drag-overlay"><h1>📂 Drop files to start!</h1></div>}
      
      <button className="theme-toggle" onClick={toggleTheme}>{theme === 'dark' ? '☀️' : '🌙'}</button>

      <div className="app-container">
        <header className="header">
          <h1>RAW to JPEG</h1>
          <p className="subtitle">Pro Converter Suite</p>
        </header>

        <div className="upload-zone">
          <input type="file" multiple accept=".CR3,.CR2,.NEF,.ARW,.DNG,.RAF,.ORF,.RW2" onChange={handleFileChange} className="file-input"/>
          <div className="upload-content">
            <span className="upload-icon">⚡</span>
            <p className="upload-text">{selectedFiles.length > 0 ? `Selected ${selectedFiles.length} files` : "Drag & Drop or Click"}</p>
          </div>
        </div>

        <div className="controls-row">
          <div className="quality-selector">
            <label>Quality:</label>
            <select value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="100">Lossless</option>
              <option value="90">High</option>
              <option value="75">Web</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleConvert} disabled={selectedFiles.length === 0}>START CONVERSION</button>
          {convertedImages.length > 0 && <button className="btn btn-secondary" onClick={downloadAll}>DOWNLOAD ZIP</button>}
        </div>

        {progress > 0 && progress < 100 && <div className="progress-container"><div className="progress-fill" style={{ width: `${progress}%` }}></div></div>}

        <div className="image-grid">
          {convertedImages.map((img, index) => (
            <ImageCard key={index} img={img} />
          ))}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------
// 🖼️ NEW SUB-COMPONENT: Individual Image Card
// --------------------------------------------------------
function ImageCard({ img }) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="image-card">
      <div className="image-wrapper">
        {/* The Image (Normal or Raw Filter applied via CSS) */}
        <img 
          src={img.url} 
          alt="Result" 
          className={`preview-img ${showRaw ? 'raw-mode' : ''}`}
        />
        
        {/* The Toggle Switch (Hold to View) */}
        <button 
          className="raw-toggle-btn"
          onMouseDown={() => setShowRaw(true)}
          onMouseUp={() => setShowRaw(false)}
          onMouseLeave={() => setShowRaw(false)}
          onTouchStart={() => setShowRaw(true)} // Mobile support
          onTouchEnd={() => setShowRaw(false)}
        >
          {showRaw ? 'RAW' : 'JPEG'}
        </button>
      </div>

      <div className="card-info">
        <div className="file-name">{img.newName}</div>
        <div className="exif-badge">📷 {img.exif.camera}</div>
        <a href={img.url} download={img.newName} style={{textDecoration: 'none'}}>
          <button className="btn-download-mini">SAVE JPEG</button>
        </a>
      </div>
    </div>
  );
}

export default App;