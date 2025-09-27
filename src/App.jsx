// import { useState, useEffect } from "react";

// function App() {
//   const [file, setFile] = useState(null);
//   const [videos, setVideos] = useState([]);
//   const [selectedVideo, setSelectedVideo] = useState(null);
//   const [selectedResolution, setSelectedResolution] = useState(null);

//   // Fetch videos from server
//   const fetchVideos = async () => {
//     try {
//       const res = await fetch("http://localhost:5000/videos");
//       const data = await res.json();
//       setVideos(data);
//     } catch (err) {
//       console.error("Error fetching videos:", err);
//     }
//   };

//   useEffect(() => {
//     fetchVideos();
//   }, []);

//   // Upload handler
//   const handleUpload = async (e) => {
//     e.preventDefault();
//     if (!file) return alert("Please select a file");

//     const formData = new FormData();
//     formData.append("video", file);

//     try {
//       const res = await fetch("http://localhost:5000/upload", {
//         method: "POST",
//         body: formData,
//       });

//       if (!res.ok) throw new Error("Upload failed");

//       const data = await res.json();
//       alert("Upload successful");

//       setFile(null);
//       fetchVideos(); // Refresh list
//     } catch (err) {
//       console.error(err);
//       alert("Error uploading");
//     }
//   };

//   // Handle video selection
//   const handleSelectVideo = (video) => {
//     setSelectedVideo(video);
//     // Default to highest resolution
//     const sortedRes = [...video.versions].sort(
//       (a, b) => parseInt(b.resolution) - parseInt(a.resolution)
//     );
//     setSelectedResolution(sortedRes[0]);
//   };

//   return (
//     <div style={{ padding: "20px" }}>
//       <h1>Teacher Upload Portal</h1>

//       {/* Upload Form */}
//       <form onSubmit={handleUpload}>
//         <input type="file" onChange={(e) => setFile(e.target.files[0])} />
//         <button type="submit">Upload</button>
//       </form>

//       <hr />

//       {/* Video List */}
//       <h2>Available Videos</h2>
//       <ul>
//         {videos.map((vid) => (
//           <li key={vid.id}>
//             {vid.original_filename}{" "}
//             <button onClick={() => handleSelectVideo(vid)}>Play</button>
//           </li>
//         ))}
//       </ul>

//       {/* Video Player */}
//       {selectedVideo && selectedResolution && (
//         <div>
//           <h3>Now Playing: {selectedVideo.original_filename}</h3>

//           {/* Resolution selector */}
//           <div>
//             <label>Select Resolution: </label>
//             <select
//               value={selectedResolution.resolution}
//               onChange={(e) =>
//                 setSelectedResolution(
//                   selectedVideo.versions.find(
//                     (v) => v.resolution === e.target.value
//                   )
//                 )
//               }
//             >
//               {selectedVideo.versions
//                 .sort((a, b) => parseInt(b.resolution) - parseInt(a.resolution))
//                 .map((v) => (
//                   <option key={v.id} value={v.resolution}>
//                     {v.resolution}p
//                   </option>
//                 ))}
//             </select>
//           </div>

//           <video
//             width="640"
//             controls
//             src={`http://localhost:5000/stream/${selectedResolution.filename}`}
//             type="video/webm"
//           />
//         </div>
//       )}
//     </div>
//   );
// }

// export default App;

import { useState, useEffect } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedResolution, setSelectedResolution] = useState(null);
  const [uploading, setUploading] = useState(false);

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
      setUploading(true);
      const res = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      await res.json();
      alert("Upload successful");

      setFile(null);
      fetchVideos(); // Refresh list
    } catch (err) {
      console.error(err);
      alert("Error uploading");
    } finally {
      setUploading(false);
    }
  };

  // Handle video selection
  const handleSelectVideo = (video) => {
    setSelectedVideo(video);
    // Default to highest resolution
    const sortedRes = [...video.versions].sort(
      (a, b) => parseInt(b.resolution) - parseInt(a.resolution)
    );
    setSelectedResolution(sortedRes[0]);
  };

  return (
    <div className="bg-white min-h-screen p-8 text-gray-800">
      <h1 className="text-3xl font-bold mb-6">Teacher Upload Portal</h1>

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="flex items-center gap-4 mb-6">
        <label className="px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition">
          Choose File
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="hidden"
          />
        </label>

        <button
          type="submit"
          disabled={!file || uploading}
          className={`px-5 py-2 rounded-md text-white transition ${
            !file
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>

      <hr className="my-6" />

      {/* Video List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-semibold">Available Videos</h2>
          <button
            onClick={fetchVideos}
            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition"
          >
            Refresh List
          </button>
        </div>

        {videos.length === 0 ? (
          <p className="text-gray-500">No videos uploaded yet.</p>
        ) : (
          <ul className="space-y-3">
            {videos.map((vid) => (
              <li
                key={vid.id}
                className="flex items-center justify-between p-3 border rounded-md shadow-sm"
              >
                <span className="font-medium">{vid.original_filename}</span>
                <button
                  onClick={() => handleSelectVideo(vid)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Play
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Video Player */}
      {selectedVideo && selectedResolution && (
        <div className="mt-10">
          <h3 className="text-xl font-semibold mb-4">
            Now Playing: {selectedVideo.original_filename}
          </h3>

          {/* Resolution selector */}
          <div className="mb-4">
            <label className="mr-2 font-medium">Select Resolution:</label>
            <select
              value={selectedResolution.resolution}
              onChange={(e) =>
                setSelectedResolution(
                  selectedVideo.versions.find(
                    (v) => v.resolution === e.target.value
                  )
                )
              }
              className="px-3 py-2 border rounded-md"
            >
              {selectedVideo.versions
                .sort((a, b) => parseInt(b.resolution) - parseInt(a.resolution))
                .map((v) => (
                  <option key={v.id} value={v.resolution}>
                    {v.resolution}p
                  </option>
                ))}
            </select>
          </div>

          <video
            width="800"
            controls
            className="border rounded-lg shadow-lg"
            src={`http://localhost:5000/stream/${selectedResolution.filename}`}
            type="video/webm"
          />
        </div>
      )}
    </div>
  );
}

export default App;
