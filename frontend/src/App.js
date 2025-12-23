import React, { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import './App.css'; 

function App() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [convertedImages, setConvertedImages] = useState([]);
  const [status, setStatus] = useState("Idle");

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFiles(Array.from(event.target.files));
      setConvertedImages([]);
      setStatus("Idle");
    }
  };

  const handleConvert = async () => {
    if (selectedFiles.length === 0) return;

    // Reset status and keep old images? No, let's clear for a fresh run
    setStatus("Converting...");
    const newConvertedImages = [];
    let errorCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const formData = new FormData();
      formData.append("file", file);

      try {
        setStatus(`Processing ${i + 1}/${selectedFiles.length}: ${file.name}...`);
        
        const response = await fetch("https://universal-raw-to-jpeg-convertor-api.onrender.com", {
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
          console.error("Server Error:", response.statusText);
          errorCount++;
        }
      } catch (error) {
        console.error("Connection Error:", error);
        errorCount++;
      }
    }

    setConvertedImages(newConvertedImages);
    
    // Give smarter feedback
    if (errorCount > 0 && newConvertedImages.length === 0) {
      setStatus(`Failed: Server crashed or timed out on all ${errorCount} files.`);
    } else if (errorCount > 0) {
      setStatus(`Done! Converted ${newConvertedImages.length} images (${errorCount} failed).`);
    } else {
      setStatus("Done! All images converted successfully.");
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
    <div className="app-container">
      {/* UPDATED HEADING HERE */}
      <h1>RAW to JPEG Converter</h1>
      <p className="subtitle">Professional Universal RAW Conversion Tool</p>

      {/* Upload Zone */}
      <div className="upload-zone">
        <input 
          type="file" 
          multiple 
          // Updated accept attribute for universal support
          accept=".CR3, .CR2, .NEF, .ARW, .DNG, .RAF, .ORF, .RW2, .PEF, .SRW" 
          onChange={handleFileChange} 
          className="file-input"
        />
        <span className="upload-icon">☁️</span>
        <p>
          {selectedFiles.length > 0 
            ? `Selected ${selectedFiles.length} files` 
            : "Drag & drop RAW files here, or click to upload"}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="action-area">
        <button 
          className="btn btn-primary"
          onClick={handleConvert} 
          disabled={selectedFiles.length === 0 || status.includes("Processing")}
        >
          {status.includes("Processing") ? "Converting..." : "🚀 Start Conversion"}
        </button>

        {convertedImages.length > 0 && (
          <button className="btn btn-warning" onClick={downloadAll}>
            📦 Download ZIP
          </button>
        )}
      </div>

      {/* Status Message */}
      <p className={`status-text ${status === "Done!" ? "status-done" : ""}`}>
        {status === "Idle" ? "" : status}
      </p>

      {/* Results Grid */}
      <div className="image-grid">
        {convertedImages.map((img, index) => (
          <div key={index} className="image-card">
            <img src={img.url} alt="Result" className="preview-img" />
            <div className="file-name">{img.newName}</div>
            
            <a href={img.url} download={img.newName} style={{textDecoration: 'none'}}>
              <button className="btn btn-success" style={{width: '100%', fontSize: '0.8rem', padding: '8px'}}>
                ⬇ Save
              </button>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;