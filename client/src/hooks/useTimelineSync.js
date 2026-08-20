import { useState, useRef, useCallback } from "react";

export const useTimelineSync = () => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const playerRef = useRef(null);

  const handleTimeUpdate = useCallback(() => {
    if (playerRef.current) {
      setCurrentTime(playerRef.current.currentTime);
    }
  }, []);

  const handleDurationChange = useCallback(() => {
    if (playerRef.current) {
      setDuration(playerRef.current.duration);
    }
  }, []);

  const seekTo = useCallback(
    (time) => {
      if (playerRef.current) {
        playerRef.current.currentTime = time;
        setCurrentTime(time);
        if (!isPlaying) {
          playerRef.current.play().catch(() => {});
          setIsPlaying(true);
        }
      }
    },
    [isPlaying],
  );

  const togglePlayPause = useCallback(() => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
        setIsPlaying(false);
      } else {
        playerRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  }, [isPlaying]);

  return {
    currentTime,
    duration,
    isPlaying,
    playerRef,
    seekTo,
    togglePlayPause,
    handleTimeUpdate,
    handleDurationChange,
    setIsPlaying,
  };
};
