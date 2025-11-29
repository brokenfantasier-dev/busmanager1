function speak(text, times = 1) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('Text-to-Speech không được hỗ trợ trên trình duyệt này.');
    return;
  }

  // Hủy bỏ mọi lời nói đang chờ hoặc đang phát
  window.speechSynthesis.cancel();
  
  const allVoices = window.speechSynthesis.getVoices();
  const vietnameseVoice = allVoices.find(voice => voice.lang === 'vi-VN');

  const createUtterance = (txt) => {
    const utterance = new SpeechSynthesisUtterance(txt);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    
    // Chỉ định giọng nói tiếng Việt nếu tìm thấy
    if (vietnameseVoice) {
      utterance.voice = vietnameseVoice;
    } else if (allVoices.length > 0) {
      console.warn('Không tìm thấy giọng nói tiếng Việt (vi-VN). Sử dụng giọng nói mặc định.');
    }
    
    return utterance;
  };

  const play = () => {
    for (let i = 0; i < times; i++) {
      const utteranceCopy = createUtterance(text);
      window.speechSynthesis.speak(utteranceCopy);
    }
  }

  if (allVoices.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
        play();
        window.speechSynthesis.onvoiceschanged = null; // Clean up listener
    };
  } else {
    play();
  }
}

    