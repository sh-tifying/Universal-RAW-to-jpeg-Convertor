import React, { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import './App.css'; 

function App() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [convertedImages, setConvertedImages] = useState([]);
  const [status, setStatus] = useState("Idle");

  // YOUR API URL - MAKE SURE THIS IS CORRECT
  // const API_URL = "http://127.0.0.1:5000/convert"; // FOR LOCALHOST
  const API_URL = "https://universal-raw-to-jpeg-convertor-api.onrender.com/convert"; // FOR CLOUD

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
          errorCount++;
        }
      } catch (error) {
        console.error(error);
        errorCount++;
      }
    }

    setConvertedImages(newConvertedImages);
    if (errorCount > 0) {
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
    <div className="app-container">
      
      {/* Header Section */}
      <header className="header">
        <h1>RAW to JPEG</h1>
        <p className="subtitle">High-Performance Converter</p>
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
  );
}

export default App;