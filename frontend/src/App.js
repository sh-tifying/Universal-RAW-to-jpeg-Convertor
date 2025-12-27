import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import toast, { Toaster } from 'react-hot-toast'; 
import './App.css'; 
import ParticlesBackground from './ParticlesBackground'; 

function App() {
  // 🟢 LOADER STATES
  const [showLoader, setShowLoader] = useState(true);      
  const [isTransitioning, setIsTransitioning] = useState(false); 

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [convertedImages, setConvertedImages] = useState([]);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false); 
  const [quality, setQuality] = useState(90); 
  const [theme, setTheme] = useState('dark'); 
  
  const fileInputRef = useRef(null);
  const API_URL = "https://universal-raw-to-jpeg-convertor-api.onrender.com/convert";
  //const API_URL = "http://127.0.0.1:5000/convert"; 

  // 🟢 ANIMATION SEQUENCE
  useEffect(() => {
    // 1. Typing happens for first 2.2s
    const moveTimer = setTimeout(() => {
      setIsTransitioning(true); // Trigger Slide Up
    }, 2200);

    // 2. Slide Up takes 0.8s. After 3s total, remove loader.
    const removeTimer = setTimeout(() => {
      setShowLoader(false); // This triggers the Main Logo to appear
    }, 3000);

    return () => { clearTimeout(moveTimer); clearTimeout(removeTimer); };
  }, []);

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
    e.target.value = ''; 
  };

  const handleFiles = (files) => {
    const newFiles = Array.from(files);
    setSelectedFiles(prev => [...prev, ...newFiles]);
    setProgress(0);
    toast.success(`Added ${newFiles.length} files!`, { icon: 'Hz' });
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleStartFresh = () => {
    setSelectedFiles([]);
    setConvertedImages([]);
    setProgress(0);
    toast('Started a new batch', { icon: '✨' });
  };

  const triggerFileUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleConvert = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    const toastId = toast.loading('Converting batch...');
    setProgress(0);
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
          const cameraModel = response.headers.get("X-Exif-Camera") || "Unknown Camera";

          setConvertedImages(prev => [...prev, {
            originalName: file.name, newName, url, data: blob, exif: { camera: cameraModel }
          }]);
        } else { errorCount++; toast.error(`Failed: ${file.name}`); }
      } catch (error) { console.error(error); errorCount++; }
      setProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
    }
    setIsProcessing(false);
    setSelectedFiles([]); 
    toast.dismiss(toastId);
    if (errorCount === 0) toast.success("Batch Complete!");
    else toast.error(`Done with ${errorCount} errors.`);
  };

  const downloadAll = () => {
    const zip = new JSZip();
    convertedImages.forEach((img) => zip.file(img.newName, img.data));
    zip.generateAsync({ type: "blob" }).then((content) => saveAs(content, "converted_photos.zip"));
  };

  const getGridClass = () => {
    const count = convertedImages.length;
    if (count === 1) return 'grid-single';
    if (count <= 4) return 'grid-few';
    if (count <= 12) return 'grid-standard';
    return 'grid-dense';
  };

  const hasQueue = selectedFiles.length > 0;

  return (
    <div 
      onDragOver={handleDragOver} 
      onDragLeave={handleDragLeave} 
      onDrop={handleDrop} 
      className={`app-wrapper ${isTransitioning ? 'visible' : 'hidden'}`}
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%' }}
    >
      <Toaster position="top-right" /> 
      <ParticlesBackground />
      
      {showLoader && <IntroLoader transitioning={isTransitioning} />}

      {isDragging && <div className="drag-overlay"><h1>📂 Drop to Add Files</h1></div>}
      <button className="theme-toggle" onClick={toggleTheme}>{theme === 'dark' ? '☀️' : '🌙'}</button>

      <div className="app-container" style={{ flex: 1 }}>
        <input type="file" multiple accept=".CR3,.CR2,.NEF,.ARW,.DNG,.RAF,.ORF,.RW2" onChange={handleFileChange} style={{ display: 'none' }} ref={fileInputRef} />

        <header className="header">
          {/* Main Logo stays HIDDEN until the loader is completely gone */}
          <h1 className={`main-logo ${showLoader ? 'invisible-logo' : ''}`}>RAWStack.</h1>
          <p className="subtitle">Pro Converter Suite</p>
        </header>

        {!hasQueue && convertedImages.length === 0 && (
          <div className="upload-zone" onClick={triggerFileUpload}>
            <div className="upload-content">
              <span className="upload-icon">⚡</span>
              <p className="upload-text">Drag & Drop or Click to Start</p>
            </div>
          </div>
        )}

        {hasQueue && !isProcessing && (
          <div className="pending-list-container">
            <div className="list-header">
              <h3>Pending Files ({selectedFiles.length})</h3>
              <button className="btn-text" onClick={triggerFileUpload}>+ Add More</button>
            </div>
            <div className="file-list">
              {selectedFiles.map((file, index) => (
                <div key={index} className="file-item">
                  <span className="file-item-name">{file.name}</span>
                  <span className="file-item-size">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                  <button className="btn-remove" onClick={() => removeFile(index)}>❌</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="controls-row">
          <div className="quality-selector">
            <label>Quality:</label>
            <select value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="100">Lossless</option>
              <option value="90">High</option>
              <option value="75">Web</option>
            </select>
          </div>
          {hasQueue && !isProcessing && <button className="btn btn-primary" onClick={handleConvert}>CONVERT {selectedFiles.length} FILES</button>}
          {isProcessing && <button className="btn btn-primary" disabled>PROCESSING...</button>}
        </div>

        {(progress > 0 && progress < 100) || isProcessing ? (
          <div className="progress-container"><div className="progress-fill" style={{ width: `${progress}%` }}></div></div>
        ) : null}

        {!hasQueue && convertedImages.length > 0 && (
            <div className="done-actions">
              <button className="btn btn-secondary" onClick={triggerFileUpload}>➕ ADD MORE</button>
              <button className="btn btn-primary" onClick={downloadAll}>⬇️ DOWNLOAD ZIP</button>
              <button className="btn btn-danger" onClick={handleStartFresh}>🔄 NEW BATCH</button>
            </div>
        )}

        <div className={`image-grid ${getGridClass()}`}>
          {convertedImages.map((img, index) => <ImageCard key={index} img={img} />)}
        </div>
      </div>

      <footer className="app-footer">
        <div className="footer-content">
          <h2 className="footer-logo">RAWStack.</h2>
          <div className="footer-links">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="footer-link">GitHub Source</a>
            <span className="divider">•</span>
            <a href="#" className="footer-link">Terms & Conditions</a>
            <span className="divider">•</span>
            <a href="#" className="footer-link">Privacy Policy</a>
          </div>
          <p className="copyright">&copy; {new Date().getFullYear()} RAWStack Image Tools</p>
        </div>
      </footer>
    </div>
  );
}

function IntroLoader({ transitioning }) {
  const [text, setText] = useState("");
  const fullText = "RAWStack.";

  useEffect(() => {
    let i = 0;
    const typingInterval = setInterval(() => {
      setText(fullText.slice(0, i + 1));
      i++;
      if (i === fullText.length) clearInterval(typingInterval);
    }, 120); 
    return () => clearInterval(typingInterval);
  }, []);

  return (
    <div className={`intro-loader ${transitioning ? 'move-up' : ''}`}>
      <div className="intro-text-wrapper">
        <h1 className="intro-text">
          {text}<span className={`cursor ${transitioning ? 'hide-cursor' : ''}`}>|</span>
        </h1>
      </div>
    </div>
  );
}

function ImageCard({ img }) {
  const [showRaw, setShowRaw] = useState(false);
  return (
    <div className="image-card">
      <div className="image-wrapper">
        <img src={img.url} alt="Result" className={`preview-img ${showRaw ? 'raw-mode' : ''}`}/>
        <button className="raw-toggle-btn" onMouseDown={() => setShowRaw(true)} onMouseUp={() => setShowRaw(false)} onMouseLeave={() => setShowRaw(false)} onTouchStart={() => setShowRaw(true)} onTouchEnd={() => setShowRaw(false)}>
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