"use client";

import { useEffect, useRef, useState } from "react";

// Read a File object and return its base64 content (no data: prefix)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result; // "data:<mime>;base64,AAAA..."
      const base64 = result.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Recursively walk a dropped folder using the DataTransferItem entries API
function readEntry(entry, path = "") {
  return new Promise((resolve) => {
    if (entry.isFile) {
      entry.file((file) => {
        file.relativePath = path + entry.name;
        resolve([file]);
      });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const all = [];
      const readBatch = () => {
        reader.readEntries(async (entries) => {
          if (entries.length === 0) {
            const results = await Promise.all(all);
            resolve(results.flat());
            return;
          }
          entries.forEach((e) => all.push(readEntry(e, path + entry.name + "/")));
          readBatch();
        });
      };
      readBatch();
    } else {
      resolve([]);
    }
  });
}

export default function Home() {
  const [siteName, setSiteName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [fileList, setFileList] = useState([]); // File[] with relativePath set
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [deployments, setDeployments] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const folderInput = useRef(null);
  const filesInput = useRef(null);

  const loadDeployments = async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/deployments");
      const data = await res.json();
      if (res.ok) setDeployments(data.deployments || []);
    } catch (e) {
      // silent — list is a nice-to-have
    }
    setLoadingList(false);
  };

  useEffect(() => {
    loadDeployments();
  }, []);

  const addFiles = (files) => {
    const arr = Array.from(files);
    setFileList((prev) => [...prev, ...arr]);
  };

  const handleFolderInput = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => {
      f.relativePath = f.webkitRelativePath || f.name;
    });
    addFiles(files);
  };

  const handleFilesInput = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => {
      f.relativePath = f.name;
    });
    addFiles(files);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const items = e.dataTransfer.items;
    if (items && items.length && items[0].webkitGetAsEntry) {
      const entries = Array.from(items)
        .map((item) => item.webkitGetAsEntry())
        .filter(Boolean);
      const results = await Promise.all(entries.map((entry) => readEntry(entry)));
      addFiles(results.flat());
    } else {
      const files = Array.from(e.dataTransfer.files || []);
      files.forEach((f) => (f.relativePath = f.name));
      addFiles(files);
    }
  };

  const removeFile = (idx) => {
    setFileList((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearFiles = () => setFileList([]);

  const handleSubmit = async () => {
    setError("");
    setResult(null);

    if (!siteName.trim()) return setError("Give your site a name first.");
    if (fileList.length === 0) return setError("Choose a file or folder first.");

    setLoading(true);
    try {
      const encoded = await Promise.all(
        fileList.map(async (f) => ({
          path: f.relativePath || f.name,
          data: await fileToBase64(f),
        }))
      );

      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName,
          files: encoded,
          enteredPasscode: passcode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setResult(data);
        setSiteName("");
        setFileList([]);
        loadDeployments();
      }
    } catch (e) {
      setError("Could not reach the server: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="wrap">
      <h1>Deploy Studio</h1>
      <p className="sub">Give your site a name, pick your files, and push it live.</p>

      <div className="panel">
        <label>Website name</label>
        <input
          type="text"
          placeholder="e.g. convex-lens-simulation"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
        />

        <label>Files</label>
        <div
          className={`dropzone ${dragOver ? "hover" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div>Drag a folder or files here</div>
          <div className="dz-buttons">
            <button type="button" className="secondary" onClick={() => folderInput.current?.click()}>
              Choose folder
            </button>
            <button type="button" className="secondary" onClick={() => filesInput.current?.click()}>
              Choose files
            </button>
          </div>
        </div>
        <input
          ref={folderInput}
          type="file"
          webkitdirectory=""
          directory=""
          multiple
          onChange={handleFolderInput}
        />
        <input
          ref={filesInput}
          type="file"
          multiple
          onChange={handleFilesInput}
        />

        {fileList.length > 0 && (
          <div className="file-list">
            {fileList.map((f, i) => (
              <div className="file-row" key={i}>
                <span>{f.relativePath || f.name}</span>
                <button type="button" className="remove" onClick={() => removeFile(i)}>✕</button>
              </div>
            ))}
            <button type="button" className="secondary clear" onClick={clearFiles}>
              Clear all
            </button>
          </div>
        )}

        <label>Passcode</label>
        <input
          type="password"
          placeholder="Enter the shared passcode"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
        />

        <button onClick={handleSubmit} disabled={loading}>
          {loading ? (<><span className="spinner" />Pushing live…</>) : "Push to Vercel"}
        </button>

        {result && (
          <div className="result ok">
            🎉 Live! <a href={result.url} target="_blank" rel="noreferrer">{result.url}</a>
          </div>
        )}
        {error && <div className="result err">{error}</div>}
      </div>

      <div className="panel">
        <p className="section-title">Your deployments</p>
        {loadingList && <div className="empty">Loading…</div>}
        {!loadingList && deployments.length === 0 && (
          <div className="empty">Nothing pushed yet.</div>
        )}
        {deployments.map((d) => (
          <div className="deploy-row" key={d.id}>
            <div>
              <a href={d.url} target="_blank" rel="noreferrer">{d.name}</a>
              <div className="deploy-meta">
                {d.state} · {new Date(d.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
