import React, { useState, useRef, useEffect } from "react";
import { Music2, Camera, Loader2, ExternalLink, MapPin } from "lucide-react";

function App() {
  const [image, setImage] = useState(null);
  const [emotion, setEmotion] = useState("");
  const [musicRecommendations, setMusicRecommendations] = useState([]);
  const [enrichedMusicData, setEnrichedMusicData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imageProcessed, setImageProcessed] = useState(false);
  const [userLocation, setUserLocation] = useState(null); // State to store user location
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Fetch user location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
        },
        (error) => {
          console.error("Error fetching location:", error);
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
    }
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setTimeout(() => {
        capturePhoto();
        setImageProcessed(true);
      }, 5000);
    } catch (error) {
      console.error("Error accessing the camera:", error);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const aspectRatio = video.videoWidth / video.videoHeight;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL("image/png");
      setImage(imageDataUrl);
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const detectEmotion = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/detect-emotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      const data = await response.json();
      if (data.error) {
        console.error("Error:", data.error);
      } else {
        setEmotion(data.emotion);
        await getMusicRecommendations(data.emotion);
      }
    } catch (error) {
      console.error("Error during emotion detection:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMusicRecommendations = async (emotion) => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/recommend-music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emotion }),
      });

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      const data = await response.json();
      if (data.songs) {
        const jsonString = data.songs.replace(/```json\n|\n```/g, "").trim();
        const jsonData = JSON.parse(jsonString);

        const musicList = [];
        Object.keys(jsonData).forEach((language) => {
          jsonData[language].forEach((song) => {
            musicList.push(`${song.song} by ${song.artist}`);
          });
        });
        setMusicRecommendations(musicList);

        const processedSongs = processMusicRecommendations(musicList);
        const enrichedResponse = await fetch("http://localhost:5000/enrich-music-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ musicList: processedSongs }),
        });

        if (!enrichedResponse.ok) throw new Error(`HTTP error! Status: ${enrichedResponse.status}`);

        const enrichedData = await enrichedResponse.json();
        setEnrichedMusicData(enrichedData);
      } else {
        console.error("Error:", data.error || "No songs found");
      }
    } catch (error) {
      console.error("Error during music recommendation:", error);
    } finally {
      setLoading(false);
    }
  };

  const processMusicRecommendations = (recommendations) => {
    return recommendations.map((songStr) => {
      const [songName, artistsPart] = songStr.split(" by ");
      const artists = artistsPart.split(",").map((artist) => artist.trim());
      return {
        song: songName.trim(),
        artists: artists,
      };
    });
  };

  const handleCardClick = (spotifyLink) => {
    if (spotifyLink) {
      window.open(spotifyLink, '_blank', 'noopener noreferrer');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white p-6 overflow-x-hidden">
      <div className="container mx-auto max-w-4xl">
        {/* Header Section */}
        <div className="flex items-center justify-center gap-3 mb-12 animate-fade-in">
          <Music2 size={48} className="text-purple-400 animate-pulse" />
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            Emotion to Music
          </h1>
        </div>

        {/* Display User Location */}
        {userLocation && (
          <div className="mb-6 text-center text-purple-300 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-purple-400/10 px-4 py-2 rounded-full">
              <MapPin size={20} className="text-purple-400" />
              <span>
                Your Location: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
              </span>
            </div>
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-2xl transform hover:scale-[1.01] transition-all duration-300">
          {/* Camera Section */}
          <div className="relative mb-8">
            <button
              onClick={startCamera}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold 
                       hover:from-purple-600 hover:to-pink-600 transition-all duration-300 
                       flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
            >
              <Camera size={24} className="animate-bounce" />
              <span className="text-lg">Open Camera</span>
            </button>

            {!image && (
              <div className="mt-6 rounded-xl overflow-hidden shadow-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  className="w-full h-80 object-cover"
                ></video>
                <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
              </div>
            )}

            {image && (
              <div className="mt-6 rounded-xl overflow-hidden shadow-2xl transform hover:scale-[1.02] transition-all duration-300">
                <img
                  src={image}
                  alt="Captured"
                  className="w-full h-80 object-cover"
                />
              </div>
            )}

            {imageProcessed && (
              <div className="mt-4 text-center text-green-400 animate-fade-in">
                <span className="inline-flex items-center gap-2 bg-green-400/10 px-4 py-2 rounded-full">
                  ✓ Image processed successfully!
                </span>
              </div>
            )}
          </div>

          {/* Detect Emotion Button */}
          <button
            onClick={detectEmotion}
            disabled={!image || loading}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold 
                     hover:from-purple-600 hover:to-pink-600 transition-all duration-300 
                     disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed
                     flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span className="text-lg">Processing...</span>
              </>
            ) : (
              <>
                <Music2 size={24} />
                <span className="text-lg">Detect Emotion & Get Music</span>
              </>
            )}
          </button>

          {/* Emotion Display */}
          {emotion && (
            <div className="mt-8 p-6 bg-white/5 rounded-xl backdrop-blur-lg transform hover:scale-[1.02] transition-all duration-300">
              <h2 className="text-2xl font-semibold text-purple-300 mb-2 flex items-center gap-3">
                <span className="bg-purple-400/20 p-2 rounded-lg">
                  <Music2 size={24} className="text-purple-400" />
                </span>
                Detected Emotion:
                <span className="text-white bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-1 rounded-full">
                  {emotion}
                </span>
              </h2>
            </div>
          )}

          {/* Music Recommendations */}
          {enrichedMusicData.length > 0 && (
            <div className="mt-12 animate-fade-in">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-8">
                Your Personal Playlist
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrichedMusicData.map((song, index) => (
                  <div
                    key={index}
                    onClick={() => handleCardClick(song.spotifyLink)}
                    className="group relative bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 
                             transition-all duration-300 transform hover:scale-[1.02] cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 z-10"></div>
                    <img
                      src={song.cover}
                      alt={song.name}
                      className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=400&h=300&fit=crop';
                        e.target.alt = 'Music placeholder';
                      }}
                    />
                    <div className="relative z-20 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Music2 size={20} className="text-purple-400 flex-shrink-0" />
                        <div>
                          <p className="text-gray-200 font-semibold line-clamp-1">{song.name}</p>
                          <p className="text-gray-400 text-sm line-clamp-1">{song.artist}</p>
                        </div>
                      </div>
                      {song.spotifyLink && (
                        <div className="flex items-center gap-2 text-sm text-purple-400 group-hover:text-purple-300">
                          <ExternalLink size={16} />
                          <span>Open in Spotify</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;