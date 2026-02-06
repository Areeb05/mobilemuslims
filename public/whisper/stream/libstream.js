// Placeholder for libstream.js - compiled from stream.wasm example
// This file should be replaced with the actual compiled JavaScript from:
// whisper.cpp/examples/stream.wasm/ after building with Emscripten

// Mock implementation for development/testing
(function() {
  'use strict';

  // Global stream object that mimics the stream.wasm API
  window.stream = {
    // Mock contexts to simulate multiple concurrent streams
    contexts: [],
    currentTranscription: '',
    status: 'Ready',

    // Initialize a new stream with model and language
    init: function(modelUrl, language) {
      console.log('Mock stream.init called with:', modelUrl, language);

      // Simulate async model loading
      setTimeout(() => {
        this.status = 'Model loaded successfully';
        console.log('Mock model loaded');
      }, 2000);

      // Return a mock stream ID (1-based)
      const streamId = this.contexts.length + 1;
      this.contexts.push({ id: streamId, language, modelUrl });
      return streamId;
    },

    // Send audio data to the stream
    set_audio: function(streamId, audioBuffer) {
      // Mock audio processing
      console.log('Mock processing audio buffer of length:', audioBuffer.length);

      // Simulate transcription with some delay
      setTimeout(() => {
        // Generate mock Arabic transcription
        const arabicPhrases = [
          'السلام عليكم',
          'الحمد لله',
          'الله أكبر',
          'سبحان الله',
          'لا إله إلا الله'
        ];

        const randomPhrase = arabicPhrases[Math.floor(Math.random() * arabicPhrases.length)];
        this.currentTranscription = randomPhrase;
        this.status = 'Transcription updated';
      }, 1000 + Math.random() * 2000); // 1-3 second delay
    },

    // Get the current transcribed text
    get_transcribed: function() {
      return this.currentTranscription;
    },

    // Get the current status
    get_status: function() {
      return this.status;
    },

    // Set status message
    set_status: function(status) {
      this.status = status;
    },

    // Free/cleanup a stream
    free: function(streamId) {
      console.log('Mock freeing stream:', streamId);
      const index = this.contexts.findIndex(ctx => ctx.id === streamId);
      if (index > -1) {
        this.contexts.splice(index, 1);
      }
    }
  };

  console.log('Mock stream.wasm loaded successfully');
  console.log('Available API:', Object.keys(window.stream));

})();