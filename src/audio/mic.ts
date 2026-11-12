// 마이크 열기 + 16kHz PCM 변환 + 간단한 발화 감지(VAD, 지연 계측용).

export interface MicOptions {
  onPcm(buf: ArrayBuffer): void;
  onSpeechStart?(t: number): void;
  onSpeechEnd?(t: number): void;
}

export interface MicHandle {
  stop(): void;
}

export async function openMic(opts: MicOptions): Promise<MicHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const ctx = new AudioContext();
  await ctx.audioWorklet.addModule(new URL('pcm-worklet.js', document.baseURI).href);
  const src = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'pcm-worklet');
  // 출력은 무음으로 연결(일부 브라우저는 destination에 연결돼야 process가 돈다)
  const mute = ctx.createGain();
  mute.gain.value = 0;
  src.connect(node).connect(mute).connect(ctx.destination);

  // 적응형 임계값 VAD: 잡음 바닥의 3배 이상이 60ms 지속되면 발화 시작, 400ms 미만 유지되면 끝
  let noise = 0.005;
  let speaking = false;
  let above = 0;
  let below = 0;
  node.port.onmessage = (e: MessageEvent) => {
    const m = e.data;
    if (m.type === 'pcm') {
      opts.onPcm(m.buf as ArrayBuffer);
      return;
    }
    const rms = m.rms as number;
    const thr = Math.max(0.012, noise * 3);
    if (rms > thr) {
      above++;
      below = 0;
      if (!speaking && above >= 3) {
        speaking = true;
        opts.onSpeechStart?.(performance.now() - 60);
      }
    } else {
      below++;
      above = 0;
      if (!speaking) noise = noise * 0.95 + rms * 0.05;
      if (speaking && below >= 20) {
        speaking = false;
        opts.onSpeechEnd?.(performance.now() - 400);
      }
    }
  };
  if (ctx.state === 'suspended') await ctx.resume();

  return {
    stop() {
      node.port.onmessage = null;
      stream.getTracks().forEach((tr) => tr.stop());
      void ctx.close();
    },
  };
}
