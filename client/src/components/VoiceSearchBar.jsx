import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Search, Loader2, X } from "lucide-react";
import { toast } from "react-toastify";
import searchApi from "../services/searchApi";

/**
 * VoiceSearchBar Component (#2010)
 * Voice-enabled search bar with speech recognition, microphone permission handling,
 * and fallback error states.
 */
const VoiceSearchBar = ({
  onResults,
  onQueryChange,
  placeholder = "Speak or type your search query...",
  className = "",
}) => {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const finalTranscriptRef = useRef(finalTranscript);
  const handleSearchRef = useRef(null);

  useEffect(() => {
    finalTranscriptRef.current = finalTranscript;
    if (onQueryChange) {
      onQueryChange(finalTranscript);
    }
  }, [finalTranscript, onQueryChange]);

  const handleSearch = useCallback(
    async (queryText) => {
      const q = (queryText || "").trim();
      if (!q || q.length < 3) {
        toast.error("Please speak a longer query (minimum 3 characters)");
        return;
      }

      try {
        setIsSearching(true);
        setError(null);
        const data = await searchApi.voiceSearch(q);

        if (data.success) {
          const res = data.results || [];
          setResults(res);
          if (onResults) {
            onResults(res);
          }

          if (res.length === 0) {
            toast.info("No results found for your query");
          } else {
            toast.success(`Found ${res.length} result(s)`);
          }
        }
      } catch (err) {
        console.error("Voice search error:", err);
        const errMsg =
          err.response?.data?.message || err.message || "Search failed";
        setError(errMsg);
        toast.error(errMsg);
      } finally {
        setIsSearching(false);
      }
    },
    [onResults],
  );

  useEffect(() => {
    handleSearchRef.current = handleSearch;
  }, [handleSearch]);

  useEffect(() => {
    // Check if browser supports speech recognition
    if (
      typeof window === "undefined" ||
      (!("webkitSpeechRecognition" in window) &&
        !("SpeechRecognition" in window))
    ) {
      setError("Speech recognition is not supported in this browser");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (finalTranscriptRef.current && handleSearchRef.current) {
        handleSearchRef.current(finalTranscriptRef.current);
      }
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimTranscript(interim);
      if (final) {
        setFinalTranscript(final);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);

      if (event.error === "not-allowed") {
        const msg =
          "Microphone permission denied. Please allow microphone access in browser settings.";
        setError(msg);
        toast.error("Microphone permission denied");
      } else if (event.error === "no-speech") {
        setError("No speech detected. Please try speaking again.");
        toast.error("No speech detected");
      } else {
        setError("Speech recognition error. Please try again.");
        toast.error("Speech recognition error");
      }
    };

    window.recognitionInstance = recognition;

    return () => {
      if (window.recognitionInstance) {
        window.recognitionInstance.abort();
      }
    };
  }, []);

  const startListening = () => {
    if (window.recognitionInstance) {
      setInterimTranscript("");
      setFinalTranscript("");
      try {
        window.recognitionInstance.start();
      } catch (err) {
        console.error("Could not start recognition:", err);
      }
    } else {
      setError("Speech recognition is not available");
    }
  };

  const stopListening = () => {
    if (window.recognitionInstance) {
      window.recognitionInstance.stop();
    }
  };

  const handleTextSearch = (e) => {
    if (e.key === "Enter" && finalTranscript.trim().length >= 3) {
      handleSearch(finalTranscript);
    }
  };

  const clearSearch = () => {
    setFinalTranscript("");
    setInterimTranscript("");
    setResults([]);
    setError(null);
    if (onResults) {
      onResults([]);
    }
  };

  return (
    <div
      className={`w-full ${className}`}
      role="search"
      data-testid="voice-search-bar"
    >
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              aria-label="Voice or text search query input"
              placeholder={placeholder}
              value={finalTranscript || interimTranscript}
              onChange={(e) => setFinalTranscript(e.target.value)}
              onKeyDown={handleTextSearch}
              className="w-full pl-10 pr-24 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm shadow-sm"
              disabled={isSearching}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {finalTranscript && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                disabled={isSearching}
                aria-label={
                  isListening ? "Stop recording" : "Start voice search"
                }
                className={`p-1.5 rounded-lg transition-colors ${
                  isListening
                    ? "bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 animate-pulse"
                    : "bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isListening ? "Stop recording" : "Start voice search"}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Interim transcript indicator */}
        {isListening && interimTranscript && (
          <div className="absolute top-full left-0 right-0 mt-2 p-2.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300 shadow-md z-10">
            <span className="font-bold">Listening:</span> {interimTranscript}
          </div>
        )}

        {/* Error message / mic permission fallback */}
        {error && (
          <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isSearching && (
        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Searching memories by voice...</span>
        </div>
      )}

      {/* Results preview */}
      {results.length > 0 && !isSearching && (
        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl">
          <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">
            Voice Search Results ({results.length})
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {results.slice(0, 3).map((result, index) => (
              <div
                key={index}
                className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
              >
                <p className="font-bold text-gray-900 dark:text-white">
                  {result.title || result.name || "Meeting Memory"}
                </p>
                <p className="text-gray-600 dark:text-gray-300 text-xs truncate mt-0.5">
                  {result.summary || result.text || result.transcript}
                </p>
                {result.score && (
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 font-mono">
                    Relevance Score: {result.score}
                  </p>
                )}
              </div>
            ))}
            {results.length > 3 && (
              <p className="text-xs text-gray-500 text-center pt-1">
                +{results.length - 3} more results
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceSearchBar;
