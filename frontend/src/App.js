import React, { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import './App.css'; 
import ParticlesBackground from './ParticlesBackground'; // Ensure this file exists!

function App() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [convertedImages, setConvertedImages] = useState([]);
  const [status, setStatus] = useState("Idle");

  // ---------------------------------------------------------
  // 🔴 IMPORTANT: Update this URL to your Render backend
  // If running locally, use: "http://127.0.0.1:5000/convert"
  // ---------------------------------------------------------
  const API_URL = "https://universal-raw-to-jpeg-convertor-api.onrender.com/convert"; 

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFiles(Array.from(event.target.files));
      setConvertedImages([]);
      setStatus("Idle");
    }
  };

  const handleConvert = async () => {
    if (selectedFiles.length === 0) return;

    setStatus("Processing...");
    const newConvertedImages = [];
    let errorCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const formData = new FormData();
      formData.append("file", file);

      try {
        setStatus(`Processing ${i + 1} of ${selectedFiles.length}...`);
        
        // Debug check (remove later if needed)
        // alert(`Sending to: ${API_URL}`); 

        const response = await fetch(API_URL, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const newName = file.name.substring(0, file.name.lastIndexOf('.')) + ".jpg";

          newConvertedImages.push({
            originalName: file.name,
            newName: newName,
            url: url,
            data: blob 
          });
        } else {
          console.error(`Server Error on file ${file.name}: ${response.statusText}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`Connection Error on file ${file.name}:`, error);
        errorCount++;
      }
    }

    setConvertedImages(newConvertedImages);
    
    if (errorCount > 0 && newConvertedImages.length === 0) {
      setStatus(`Failed: Server error on all ${errorCount} files.`);
    } else if (errorCount > 0) {
      setStatus(`Completed with ${errorCount} errors.`);
    } else {
      setStatus("Done!");
    }
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
    <>
      {/* 1. The Interactive Background */}
      <ParticlesBackground />

      {/* 2. The Main App Content */}
      <div className="app-container">
        
        {/* Header Section */}
        <header className="header">
          <h1>RAW to JPEG</h1>
          <p className="subtitle">Universal High-Speed Converter</p>
        </header>

        {/* Upload Section */}
        <div className="upload-zone">
          <input 
            type="file" 
            multiple 
            accept=".CR3, .CR2, .NEF, .ARW, .DNG, .RAF, .ORF, .RW2, .PEF, .SRW" 
            onChange={handleFileChange} 
            className="file-input"
          />
          <div className="upload-content">
            <span className="upload-icon">⚡</span>
            <p className="upload-text">
              {selectedFiles.length > 0 
                ? <span>Selected {selectedFiles.length} RAW files</span> 
                : "Drop files here or click to browse"}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="action-area">
          <button 
            className="btn btn-primary"
            onClick={handleConvert} 
            disabled={selectedFiles.length === 0 || status.includes("Processing")}
          >
            {status.includes("Processing") ? "PROCESSING..." : "START CONVERSION"}
          </button>

          {convertedImages.length > 0 && (
            <button className="btn btn-secondary" onClick={downloadAll}>
              DOWNLOAD ALL (ZIP)
            </button>
          )}
        </div>

        {/* Status Bar */}
        <div className="status-bar">
          <span className={`status-text ${status === "Done!" ? "status-success" : ""}`}>
            {status === "Idle" ? "" : status}
          </span>
        </div>

        {/* Results Grid */}
        <div className="image-grid">
          {convertedImages.map((img, index) => (
            <div key={index} className="image-card">
              <img src={img.url} alt="Result" className="preview-img" />
              <div className="card-info">
                <div className="file-name">{img.newName}</div>
                <a href={img.url} download={img.newName} style={{textDecoration: 'none'}}>
                  <button className="btn-download-mini">SAVE JPEG</button>
                </a>
              </div>
            </div>
          ))}
        </div>

      </div>
    </>
  );
}

export default App;