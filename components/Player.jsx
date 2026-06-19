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
  const [useProxyForced, setUseProxyForced] = useState(false);
  const [lastStreamUrl, setLastStreamUrl] = useState(streamUrl);

  if (streamUrl !== lastStreamUrl) {
    setLastStreamUrl(streamUrl);
    setUseProxyForced(false);
  }
  
  const hlsRef = useRef(null);
  const dashRef = useRef(null);
  const mpegtsRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const loadTierRef = useRef(null);

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
      
      const tierOrder = [2, 1, 3];
      let currentTierIndex = 0;

      const cleanupPlayers = () => {
         if (dashRef.current) {
             if (typeof dashRef.current.destroy === 'function') dashRef.current.destroy();
             else if (typeof dashRef.current.reset === 'function') dashRef.current.reset();
             dashRef.current = null;
         }
         if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
         if (mpegtsRef.current) { mpegtsRef.current.destroy(); mpegtsRef.current = null; }
         if (videoRef.current) videoRef.current.src = '';
      };

      const handleTierFailure = (failedTier, errorEvent) => {
         if (isCancelled) return;
         const code = errorEvent?.code || errorEvent?.type || 'UNKNOWN';
         console.log(`[Error] Server ${failedTier} failed (Code: ${code}). Switching...`);
         
         if (currentTierIndex < tierOrder.length - 1) {
            currentTierIndex++;
            loadTier(tierOrder[currentTierIndex]);
         } else {
            console.error('[Error] All tiers exhausted. Stream failed.');
            setError(`Stream failed to load (Code: ${code}). Please try again later.`);
            setIsBuffering(false);
         }
      };

      const loadTier = async (tier) => {
         if (isCancelled) return;
         cleanupPlayers();

         let proxyName = "Cloudflare Worker";
         if (tier === 2) proxyName = "Next.js Proxy";
         if (tier === 3) proxyName = "Custom IP Proxy";

         const targetUrl = streamUrl.trim();

         let finalStreamUrl = targetUrl;
         if (tier === 1) {
             finalStreamUrl = `https://iptv-proxy.mdmokammelmorshed.workers.dev/?url=${encodeURIComponent(targetUrl)}`;
         } else if (tier === 2) {
             finalStreamUrl = `/api/proxy?targetUrl=${encodeURIComponent(targetUrl)}`;
         } else if (tier === 3) {
             finalStreamUrl = `https://<YOUR_CUSTOM_IP_PROXY_HERE>/?url=${encodeURIComponent(targetUrl)}`;
         }

         console.log(`[Proxy Step] Attempting Server ${tier} (${proxyName})`);
         setIsBuffering(true);

         try {
            if (isMp4) {
               video.src = finalStreamUrl;
               video.addEventListener('loadedmetadata', () => {
                  if (isCancelled) return;
                  setIsBuffering(false);
                  console.log(`[Success] MP4 loaded via Server ${tier}.`);
                  video.play().catch((err) => {
                     if (err.name !== 'AbortError') console.warn('Auto-play prevented:', err);
                  });
               }, { once: true });
               video.addEventListener('error', (e) => {
                  if (isCancelled) return;
                  handleTierFailure(tier, e);
               }, { once: true });
            } else if (isDash) {
               const shaka = await import('shaka-player/dist/shaka-player.compiled.js');
               if (isCancelled) return;
               
               dash = new shaka.Player();
               dashRef.current = dash;
               await dash.attach(video);

               const originalBaseUrl = new URL(streamUrl).origin + new URL(streamUrl).pathname.substring(0, new URL(streamUrl).pathname.lastIndexOf('/') + 1);
               let chunkLogCount = 0;

               dash.getNetworkingEngine().registerRequestFilter((type, request) => {
                  let requestUrl = request.uris[0];
                  if (requestUrl.includes('targetUrl=') || requestUrl.includes('?url=')) return;

                  if (requestUrl.includes('/api/proxy')) {
                     const cleanPath = requestUrl.substring(requestUrl.indexOf('/api/proxy') + 10);
                     requestUrl = originalBaseUrl + (cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath);
                  } else if (requestUrl.includes('<YOUR_CUSTOM_IP_PROXY_HERE>') || requestUrl.includes('workers.dev')) {
                     try {
                        const urlParts = new URL(requestUrl);
                        requestUrl = originalBaseUrl + urlParts.pathname.substring(1) + urlParts.search;
                     } catch(e) {}
                  }

                  let proxiedChunkUrl = requestUrl;
                  if (tier === 1) proxiedChunkUrl = `https://iptv-proxy.mdmokammelmorshed.workers.dev/?url=${encodeURIComponent(requestUrl)}`;
                  else if (tier === 2) proxiedChunkUrl = `/api/proxy?targetUrl=${encodeURIComponent(requestUrl)}`;
                  else if (tier === 3) proxiedChunkUrl = `https://<YOUR_CUSTOM_IP_PROXY_HERE>/?url=${encodeURIComponent(requestUrl)}`;

                  request.uris[0] = proxiedChunkUrl;

                  if (chunkLogCount < 3 && type === shaka.net.NetworkingEngine.RequestType.SEGMENT) {
                     console.log(`[Network] Rewriting chunk URL -> [Server ${tier}]`);
                     chunkLogCount++;
                  }
               });

               const urlParams = new URL(streamUrl).searchParams;
               const keyId = urlParams.get('keyId');
               const keyVal = urlParams.get('key');
               let clearKeysConfig = {};
               if (keyId && keyVal) clearKeysConfig[keyId] = keyVal;

               dash.configure({
                  drm: { clearKeys: Object.keys(clearKeysConfig).length > 0 ? clearKeysConfig : undefined },
                  manifest: { dash: { ignoreDrmInfo: true }, retryParameters: { maxAttempts: 2, baseDelay: 1000, timeout: 10000 } },
                  streaming: { retryParameters: { maxAttempts: 2, baseDelay: 1000, timeout: 10000 } }
               });

               dash.getNetworkingEngine().registerResponseFilter((type, response) => {
                  if (type === shaka.net.NetworkingEngine.RequestType.SEGMENT) {
                     const uint8 = new Uint8Array(response.data.slice(0, 50));
                     const str = new TextDecoder().decode(uint8).toLowerCase();
                     if (str.includes('<!doctype html') || str.includes('<html')) {
                        console.warn(`[Warning] Expected video chunk, but received HTML page from Server ${tier}!`);
                     }
                  }
               });

               dash.addEventListener('error', (event) => {
                  const err = event.detail || event;
                  
                  if (err.category === shaka.util.Error.Category.DRM) {
                     const originalError = err.data && err.data[0];
                     const drmMsg = originalError ? (originalError.message || originalError) : err.message;
                     console.error(`[DRM Error] ${drmMsg} (Code: ${err.code})`);
                  }
                  
                  if (err.severity === shaka.util.Error.Severity.CRITICAL || err.code === shaka.util.Error.Code.HTTP_ERROR || err.code === shaka.util.Error.Code.BAD_HTTP_STATUS) {
                     handleTierFailure(tier, err);
                  }
               });
               dash.addEventListener('buffering', (event) => setIsBuffering(event.buffering));

               const parsedUrl = new URL(finalStreamUrl);
               parsedUrl.searchParams.delete('keyId');
               parsedUrl.searchParams.delete('key');
               
               await dash.load(parsedUrl.toString());
               if (isCancelled) return;
               console.log(`[Success] DASH manifest loaded via Server ${tier}. Waiting for chunks...`);

            } else if (isTs) {
               const mpegts = (await import('mpegts.js')).default;
               if (isCancelled) return;
               
               if (mpegts.getFeatureList().mseLivePlayback) {
                  const type = url.includes('.flv') ? 'flv' : 'mpegts';
                  mpegtsPlayer = mpegts.createPlayer({ type: type, isLive: true, url: finalStreamUrl });
                  mpegtsRef.current = mpegtsPlayer;
                  mpegtsPlayer.attachMediaElement(video);
                  mpegtsPlayer.load();
                  
                  const playPromise = mpegtsPlayer.play();
                  if (playPromise !== undefined) {
                     playPromise.then(() => {
                        setIsBuffering(false);
                        debugLog(`Success! MPEGTS loaded via Tier ${tier}.`, 'info');
                     }).catch(err => {
                        if (err.name !== 'AbortError') console.warn('Auto-play prevented:', err);
                     });
                  }
                  
                  mpegtsPlayer.on(mpegts.Events.ERROR, (errType, errDetail) => {
                     handleTierFailure(tier, { type: errType, code: errDetail });
                  });
               }
            } else {
               const Hls = (await import('hls.js')).default;
               if (isCancelled) return;
               
               if (Hls.isSupported()) {
                  hls = new Hls({
                     maxBufferLength: 30, maxMaxBufferLength: 60,
                     enableWorker: true, lowLatencyMode: true,
                     liveMaxLatencyDurationCount: 5, liveSyncDurationCount: 2,
                     manifestLoadingMaxRetry: 2, manifestLoadingMaxRetryTimeout: 2000,
                     levelLoadingMaxRetry: 2, fragLoadingMaxRetry: 2,
                     manifestLoadingTimeOut: 10000, fragLoadingTimeOut: 10000, levelLoadingTimeOut: 10000
                  });
                  hlsRef.current = hls;
                  hls.loadSource(finalStreamUrl);
                  hls.attachMedia(video);

                  hls.on(Hls.Events.MANIFEST_PARSED, () => {
                     setIsBuffering(false);
                     debugLog(`Success! HLS manifest loaded via Tier ${tier}.`, 'info');
                     video.play().catch(err => {
                        if (err.name !== 'AbortError') console.warn('Auto-play prevented:', err);
                     });
                  });

                  hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
                     const payload = data.payload;
                     if (payload && payload.byteLength > 0) {
                        const uint8 = new Uint8Array(payload.slice(0, 50));
                        const str = new TextDecoder().decode(uint8).toLowerCase();
                        if (str.includes('<!doctype html') || str.includes('<html')) {
                           debugLog(`Warning: Expected video chunk, but received HTML page from Tier ${currentTier}! (Proxy Blocked)`, 'warning');
                           hls.destroy();
                           handleTierFailure(tier, { code: 'INVALID_CONTENT_HTML' });
                        }
                     }
                  });

                  hls.on(Hls.Events.ERROR, (event, data) => {
                     if (data.response && data.response.code >= 400) {
                        handleTierFailure(tier, { code: `HTTP_${data.response.code}` });
                        return;
                     }

                     if (data.fatal) {
                        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                           handleTierFailure(tier, { code: data.details });
                        } else {
                           handleTierFailure(tier, { code: data.type });
                        }
                     }
                  });
               } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                  video.src = finalStreamUrl;
                  video.addEventListener('loadedmetadata', () => {
                     setIsBuffering(false);
                     debugLog(`Success! Native HLS loaded via Tier ${tier}.`, 'info');
                     video.play().catch(err => {
                        if (err.name !== 'AbortError') console.warn('Auto-play prevented:', err);
                     });
                  }, { once: true });
                  video.addEventListener('error', (e) => {
                     if (isCancelled) return;
                     handleTierFailure(tier, e);
                  }, { once: true });
               }
            }
         } catch (err) {
            handleTierFailure(tier, err);
         }
      };

      loadTierRef.current = loadTier;
      loadTier(tierOrder[0]);
    };

    initPlayer();

    return () => {
      isCancelled = true;
      if (hls) hls.destroy();
      if (dash) {
        if (typeof dash.destroy === 'function') {
          dash.destroy();
        } else if (typeof dash.reset === 'function') {
          dash.reset();
        }
      }
      if (mpegtsPlayer) mpegtsPlayer.destroy();
      if (videoRef.current) {
        videoRef.current.src = '';
      }
    };
  }, [streamUrl, useProxyForced]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(e => {
          if (e.name !== 'AbortError') console.warn(e);
        });
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
      videoRef.current?.play().catch(e => {
        if (e.name !== 'AbortError') console.warn(e);
      });
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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none z-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-6 text-center z-40">
          <p className="text-red-400 mb-6 font-space-mono text-[14px] uppercase">{error}</p>
          
          <button 
             onClick={handleRetry}
             className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase rounded shadow-lg transition-colors"
          >
             <RefreshCw size={18} />
             RETRY STREAM
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
