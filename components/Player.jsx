'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Maximize, Play, Pause, Volume2, VolumeX, RefreshCw } from 'lucide-react';

export default function Player({ streamUrl }) {
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState(null);
  const [showControls, setShowControls] = useState(true);
  
  const hlsRef = useRef(null);
  const dashRef = useRef(null);
  const mpegtsRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // Auto-hide controls logic
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000); // hide after 3 seconds of inactivity
    }
  }, [isPlaying]);

  useEffect(() => {
    // If paused, always show controls. If playing, start the hide timer.
    if (!isPlaying) {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      handleMouseMove();
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, handleMouseMove]);

  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    let hls = null;
    let dash = null;
    let mpegtsPlayer = null;
    let isCancelled = false;

    const initPlayer = async () => {
      const video = videoRef.current;
      if (!video) return;
      
      setError(null);
      setIsBuffering(true);

      const url = streamUrl.trim().toLowerCase();
      const isMp4 = url.includes('.mp4') || url.includes('.mkv') || url.includes('.webm');
      const isDash = url.includes('.mpd');
      const isTs = url.includes('.ts') || url.includes('.flv');

      const getProxiedUrl = (originalUrl) => {
        if (originalUrl.startsWith("http://")) {
          return `https://tv.meheran.dev/?targetUrl=${encodeURIComponent(originalUrl)}`;
        }
        return originalUrl;
      };

      const finalStreamUrl = getProxiedUrl(streamUrl.trim());

      try {
        if (isMp4) {
          video.src = finalStreamUrl;
          video.addEventListener('loadedmetadata', () => {
            if (isCancelled) return;
            setIsBuffering(false);
            video.play().catch((err) => {
              if (err.name !== 'AbortError') console.warn('Auto-play prevented:', err);
            });
          });
          video.addEventListener('error', () => {
            if (isCancelled) return;
            setError('Video failed to load.');
            setIsBuffering(false);
          });
        } else if (isDash) {
          const dashjs = (await import('dashjs')).default || await import('dashjs');
          if (isCancelled) return;
          
          dash = dashjs.MediaPlayer().create();
          dashRef.current = dash;
          dash.initialize(video, finalStreamUrl, true);
          dash.on(dashjs.MediaPlayer.events.PLAYBACK_PLAYING, () => setIsBuffering(false));
          dash.on(dashjs.MediaPlayer.events.PLAYBACK_WAITING, () => setIsBuffering(true));
          dash.on(dashjs.MediaPlayer.events.ERROR, (e) => {
            console.warn('DASH Error', e);
            setError('Stream failed to load.');
            setIsBuffering(false);
          });
        } else if (isTs) {
          const mpegts = (await import('mpegts.js')).default;
          if (isCancelled) return;
          
          if (mpegts.getFeatureList().mseLivePlayback) {
            const type = url.includes('.flv') ? 'flv' : 'mpegts';
            
            mpegtsPlayer = mpegts.createPlayer({
              type: type,
              isLive: true,
              url: finalStreamUrl,
            });
            mpegtsRef.current = mpegtsPlayer;
            mpegtsPlayer.attachMediaElement(video);
            mpegtsPlayer.load();
            
            const playPromise = mpegtsPlayer.play();
            if (playPromise !== undefined) {
              playPromise.then(() => setIsBuffering(false)).catch((err) => {
                if (err.name !== 'AbortError') console.warn('Auto-play prevented:', err);
              });
            }
            
            mpegtsPlayer.on(mpegts.Events.ERROR, (errType, errDetail) => {
              console.warn('MPEGTS Error:', errType, errDetail);
              setError('Stream failed to load.');
              setIsBuffering(false);
            });
          }
        } else {
          // Default to HLS
          const Hls = (await import('hls.js')).default;
          if (isCancelled) return;
          
          if (Hls.isSupported()) {
            hls = new Hls({
              maxBufferLength: 30,
              maxMaxBufferLength: 60,
              enableWorker: true,
              lowLatencyMode: true,
              // Live Edge Forcing: Drop old chunks if too far behind and jump to live
              liveMaxLatencyDurationCount: 5,
              liveSyncDurationCount: 2,
            });

            hlsRef.current = hls;
            hls.loadSource(finalStreamUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setIsBuffering(false);
              video.play().catch((err) => {
                if (err.name !== 'AbortError') console.warn('Auto-play prevented:', err);
                setIsPlaying(false);
              });
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    console.warn('Network dropped. Trying to fetch live data again...');
                    hls.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    console.warn('Old chunk missing or corrupt. Jumping to live edge...');
                    hls.recoverMediaError();
                    break;
                  default:
                    console.warn('Fatal error, cannot recover', data);
                    setError('Stream failed to load.');
                    setIsBuffering(false);
                    hls.destroy();
                    break;
                }
              }
            });
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Fallback for Safari
            video.src = finalStreamUrl;
            video.addEventListener('loadedmetadata', () => {
              setIsBuffering(false);
              video.play().catch((err) => {
                if (err.name !== 'AbortError') console.warn('Auto-play prevented:', err);
              });
            });
          }
        }
      } catch (err) {
        console.error('Player initialization failed:', err);
        if (!isCancelled) {
          setError('Failed to load video player engine.');
          setIsBuffering(false);
        }
      }
    };

    initPlayer();

    return () => {
      isCancelled = true;
      if (hls) hls.destroy();
      if (dash) dash.reset();
      if (mpegtsPlayer) mpegtsPlayer.destroy();
      if (videoRef.current) {
        videoRef.current.src = '';
      }
    };
  }, [streamUrl]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      if (val === 0) {
        setIsMuted(true);
        videoRef.current.muted = true;
      } else {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerContainerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleRetry = () => {
    if (hlsRef.current) {
      setError(null);
      setIsBuffering(true);
      hlsRef.current.startLoad();
      videoRef.current?.play();
    }
  };

  return (
    <div 
      ref={playerContainerRef} 
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
      className="relative w-full h-full bg-black overflow-hidden flex flex-col"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onClick={togglePlay}
        autoPlay
        playsInline
      />

      {/* Buffering Indicator */}
      {isBuffering && streamUrl && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-100"></div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-6 text-center">
          <p className="text-red-400 mb-4 font-space-mono text-[14px] uppercase">{error}</p>
          <button 
            onClick={handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white border-2 border-red-800 transition-colors uppercase font-black text-[12px]"
          >
            <RefreshCw size={16} />
            RETRY
          </button>
        </div>
      )}

      {/* Controls Overlay (Bottom Only) */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="text-white hover:text-amber-400 transition-colors">
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>
            
            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="text-white hover:text-amber-400 transition-colors">
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 overflow-hidden group-hover/volume:w-20 sm:w-20 transition-all duration-300 h-1 bg-stone-600 appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={toggleFullscreen} className="text-white hover:text-amber-400 transition-colors">
              <Maximize size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
