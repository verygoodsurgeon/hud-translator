// AudioWorklet: 마이크 float32 → 16kHz mono PCM s16le.
// 20ms마다 {type:'rms'}, 100ms마다 {type:'pcm', buf} 메시지를 보낸다.
class PcmWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000; // sampleRate는 AudioWorkletGlobalScope 전역
    this.pos = 0; // 입력 기준 다음 출력 샘플 위치(소수)
    this.out = new Int16Array(1600);
    this.outLen = 0;
    this.rmsAcc = 0;
    this.rmsN = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    // 선형 보간 다운샘플링
    while (this.pos < ch.length - 1) {
      const i = Math.floor(this.pos);
      const f = this.pos - i;
      const v = ch[i] * (1 - f) + ch[i + 1] * f;
      const s = Math.max(-1, Math.min(1, v));
      this.out[this.outLen++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      this.rmsAcc += v * v;
      this.rmsN++;
      if (this.rmsN >= 320) {
        this.port.postMessage({ type: 'rms', rms: Math.sqrt(this.rmsAcc / this.rmsN) });
        this.rmsAcc = 0;
        this.rmsN = 0;
      }
      if (this.outLen >= this.out.length) {
        const buf = this.out.slice(0).buffer;
        this.port.postMessage({ type: 'pcm', buf }, [buf]);
        this.outLen = 0;
      }
      this.pos += this.ratio;
    }
    this.pos -= ch.length;
    return true;
  }
}
registerProcessor('pcm-worklet', PcmWorklet);
