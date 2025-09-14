import { useState, useEffect } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);

  // Fetch videos from server
  const fetchVideos = async () => {
    try {
      const res = await fetch("http://localhost:5000/videos");
      const data = await res.json();
      setVideos(data);
    } catch (err) {
      console.error("Error fetching videos:", err);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // Upload handler
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a file");

    const formData = new FormData();
    formData.append("video", file);

    try {
      const res = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      alert("Upload successful: " + data.videoId);

      setFile(null);
      fetchVideos(); // Refresh list
    } catch (err) {
      console.error(err);
      alert("Error uploading");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Teacher Upload Portal</h1>

      {/* Upload Form */}
      <form onSubmit={handleUpload}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button type="submit">Upload</button>
      </form>

      <hr />

      {/* Video List */}
      <h2>Available Videos</h2>
      <ul>
        {videos.map((vid) => (
          // <li key={vid.id}>
          //   {vid.title} ({(vid.size / 1024 / 1024).toFixed(2)} MB)
          //   <button onClick={() => setSelectedVideo(vid)}>Play</button>
          // </li>
          <li key={vid.id}>
            {vid.filename}
            <button onClick={() => setSelectedVideo(vid)}>Play</button>
          </li>
        ))}
      </ul>

      {/* Video Player */}
      {selectedVideo && (
        <div>
          <h3>Now Playing: {selectedVideo.title}</h3>
          {/* <video
            width="640"
            controls
            src={`http://localhost:5000/videos/${selectedVideo.filename}`} // Use filename
            type="video/webm,video/mp4,video/mkv"
          /> */}
          <video
            width="640"
            controls
            // Use the new streaming endpoint
            src={`http://localhost:5000/stream/${selectedVideo.filename}`}
            type="video/mp4"
          />
        </div>
      )}
    </div>
  );
}

export default App;
