export function useVoice() {
  return {
    isRecording: false,
    startRecording: () => {},
    stopRecording: () => Promise.resolve(''),
    isSupported: false,
  };
}
