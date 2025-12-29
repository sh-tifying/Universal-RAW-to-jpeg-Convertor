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

  // 🟢 APP STATES
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [convertedImages, setConvertedImages] = useState([]);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false); 
  
  // 🟢 RENAMING & FORMAT STATES
  const [batchName, setBatchName] = useState('');
  const [startSeq, setStartSeq] = useState(1);
  const [format, setFormat] = useState('jpeg'); // 'jpeg', 'png', 'webp'
  const [quality, setQuality] = useState(90); 
  
  const [theme, setTheme] = useState('dark'); 
  const fileInputRef = useRef(null);
  
  // 🔴 IMPORTANT: Change this URL to your Render backend URL when deploying
  const API_URL = "http://127.0.0.1:5000/convert"; 

  // 🟢 ANIMATION SEQUENCE
  useEffect(() => {
    const moveTimer = setTimeout(() => { setIsTransitioning(true); }, 2200);
    const removeTimer = setTimeout(() => { setShowLoader(false); }, 3000);
    return () => { clearTimeout(moveTimer); clearTimeout(removeTimer); };
  }, []);

  useEffect(() => { document.body.className = theme; }, [theme]);
  const toggleTheme = () => setTheme(curr => curr === 'dark' ? 'light' : 'dark');

  // 🟢 HANDLERS
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
    setBatchName(''); 
    setStartSeq(1);
    setProgress(0);
    toast('Started a new batch', { icon: '✨' });
  };

  const triggerFileUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // 🟢 HELPER: GENERATE FILENAME (Now handles Extension!)
  const generateFilename = (baseName, index, originalName, targetFormat) => {
    const currentNum = startSeq + index;
    // Determine extension
    const ext = targetFormat === 'jpeg' ? 'jpg' : targetFormat;

    if (!baseName.trim()) {
      return originalName.substring(0, originalName.lastIndexOf('.')) + "." + ext;
    }

    const hashMatch = baseName.match(/#+/);
    if (hashMatch) {
      const padding = hashMatch[0].length;
      const numStr = currentNum.toString().padStart(padding, '0');
      return baseName.replace(hashMatch[0], numStr) + "." + ext;
    } else {
      const numStr = currentNum.toString().padStart(3, '0');
      return `${baseName.trim()}_${numStr}.${ext}`;
    }
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
      formData.append("format", format); 

      try {
        const response = await fetch(API_URL, { method: "POST", body: formData });
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const cameraModel = response.headers.get("X-Exif-Camera") || "Unknown Camera";

          // 🟢 Generate name with correct extension
          const finalName = generateFilename(batchName, i, file.name, format);

          setConvertedImages(prev => [...prev, {
            originalName: file.name, 
            newName: finalName, 
            url, 
            data: blob, 
            exif: { camera: cameraModel }
          }]);
        } else { errorCount++; toast.error(`Failed: ${file.name}`); }
      } catch (error) { console.error(error); errorCount++; }
      setProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
    }
    
    // Auto-increment sequence for next batch
    setStartSeq(prev => prev + selectedFiles.length);

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
          
          {/* 1. RENAME GROUP */}
          <div className="rename-group">
            <div className="input-with-preview">
              <div className="rename-inputs">
                <input 
                  type="text" 
                  className="batch-name-input" 
                  placeholder="Rename (e.g. Trip-###)" 
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                />
                <input 
                  type="number" 
                  className="start-seq-input" 
                  value={startSeq}
                  min="1"
                  onChange={(e) => setStartSeq(parseInt(e.target.value) || 1)}
                  title="Start Sequence Number"
                />
              </div>
              {batchName && (
                <div className="rename-preview">
                  Next: <span>{generateFilename(batchName, 0, "sample.raw", format)}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. FORMAT SELECTOR */}
          <div className="quality-selector">
            <label>Format:</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
          </div>

          {/* 3. QUALITY SELECTOR */}
          {/* Disable Quality if PNG (Lossless) is selected */}
          <div className={`quality-selector ${format === 'png' ? 'disabled-selector' : ''}`}>
            <label>Quality:</label>
            <select value={quality} onChange={(e) => setQuality(e.target.value)} disabled={format === 'png'}>
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

        {/* 🟢 SLICK FLOATING ACTION DOCK (Choice A) */}
        {!hasQueue && convertedImages.length > 0 && (
            <div className="done-actions-dock">
              <button className="btn btn-ghost" onClick={triggerFileUpload}><span>➕</span> Add More</button>
              <button className="btn btn-hero" onClick={downloadAll}><span>⬇️</span> Download All</button>
              <button className="btn btn-ghost danger-hover" onClick={handleStartFresh}><span>🔄</span> New Batch</button>
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
    const typingInterval = setInterval(() => { setText(fullText.slice(0, i + 1)); i++; if (i === fullText.length) clearInterval(typingInterval); }, 120); 
    return () => clearInterval(typingInterval);
  }, []);
  return (
    <div className={`intro-loader ${transitioning ? 'move-up' : ''}`}>
      <div className="intro-text-wrapper"><h1 className="intro-text">{text}<span className={`cursor ${transitioning ? 'hide-cursor' : ''}`}>|</span></h1></div>
    </div>
  );
}
function ImageCard({ img }) {
  const [showRaw, setShowRaw] = useState(false);
  return (
    <div className="image-card">
      <div className="image-wrapper">
        <img src={img.url} alt="Result" className={`preview-img ${showRaw ? 'raw-mode' : ''}`}/>
        <button className="raw-toggle-btn" onMouseDown={() => setShowRaw(true)} onMouseUp={() => setShowRaw(false)} onMouseLeave={() => setShowRaw(false)} onTouchStart={() => setShowRaw(true)} onTouchEnd={() => setShowRaw(false)}>{showRaw ? 'RAW' : img.newName.split('.').pop().toUpperCase()}</button>
      </div>
      <div className="card-info">
        <div className="file-name">{img.newName}</div>
        <div className="exif-badge">📷 {img.exif.camera}</div>
        <a href={img.url} download={img.newName} style={{textDecoration: 'none'}}>
          <button className="btn-download-mini">SAVE {img.newName.split('.').pop().toUpperCase()}</button>
        </a>
      </div>
    </div>
  );
}
export default App;