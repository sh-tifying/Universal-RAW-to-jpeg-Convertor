import React, { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import './App.css'; 
import ParticlesBackground from './ParticlesBackground'; 

function App() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [convertedImages, setConvertedImages] = useState([]);
  const [status, setStatus] = useState("Idle");
  const [progress, setProgress] = useState(0);

  // 🔴 CHECK YOUR RENDER URL
  const API_URL = "https://universal-raw-to-jpeg-convertor-api.onrender.com/convert"; 

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFiles(Array.from(event.target.files));
      setConvertedImages([]); // Clear old results
      setStatus("Idle");
      setProgress(0);
    }
  };

  const handleConvert = async () => {
    if (selectedFiles.length === 0) return;

    setStatus("Processing");
    setProgress(0);
    setConvertedImages([]); // Ensure gallery is empty before starting
    
    let errorCount = 0;

    // Loop through each file one by one
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch(API_URL, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const newName = file.name.substring(0, file.name.lastIndexOf('.')) + ".jpg";

          const newImageObj = {
            originalName: file.name,
            newName: newName,
            url: url,
            data: blob 
          };

          // ⚡ REAL-TIME UPDATE: Add the new image immediately!
          setConvertedImages(prevImages => [...prevImages, newImageObj]);

        } else {
          console.error(`Server Error on file ${file.name}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`Connection Error on file ${file.name}:`, error);
        errorCount++;
      }

      // Update Progress Bar immediately after this specific file is done
      const currentPercent = Math.round(((i + 1) / selectedFiles.length) * 100);
      setProgress(currentPercent);
    }

    // Final Status Update
    if (errorCount > 0 && selectedFiles.length === errorCount) {
      setStatus(`Failed: Server error on all ${errorCount} files.`);
    } else if (errorCount > 0) {
      setStatus(`Done! (${errorCount} errors)`);
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
      <ParticlesBackground />

      <div className="app-container">
        
        <header className="header">
          <h1>RAW to JPEG</h1>
          <p className="subtitle">Universal High-Speed Converter</p>
        </header>

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

        {/* PROGRESS BAR: Shows during processing OR when done */}
        {(status === "Processing" || progress > 0) && (
          <div className="progress-container">
            <div className="progress-info">
              <span>
                {progress === 100 ? "Complete" : `Converting ${convertedImages.length + 1}/${selectedFiles.length}...`}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="progress-track">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="action-area">
          <button 
            className="btn btn-primary"
            onClick={handleConvert} 
            disabled={selectedFiles.length === 0 || status === "Processing"}
          >
            {status === "Processing" ? "PROCESSING..." : "START CONVERSION"}
          </button>

          {convertedImages.length > 0 && (
            <button className="btn btn-secondary" onClick={downloadAll}>
              DOWNLOAD ALL (ZIP)
            </button>
          )}
        </div>

        <div className="status-bar">
          <span className={`status-text ${status.includes("Done") ? "status-success" : ""}`}>
            {status === "Idle" || status === "Processing" ? "" : status}
          </span>
        </div>

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