import notificationSound from "@/assets/sounds/notification.mp3";
import messageSound from "@/assets/sounds/message.mp3";
import { useSoundStore } from "@/store/useSoundStore";

type SoundType = "notification" | "message";

const sounds: Record<SoundType, string> = {
  notification: notificationSound,
  message: messageSound,
};

// 오디오 인스턴스 캐싱
const audioCache: Record<SoundType, HTMLAudioElement | null> = {
  notification: null,
  message: null,
};

function getAudio(type: SoundType): HTMLAudioElement {
  if (!audioCache[type]) {
    audioCache[type] = new Audio(sounds[type]);
  }
  return audioCache[type]!;
}

export function playSound(type: SoundType): void {
  const { newMessageSound, appNotificationSound } = useSoundStore.getState();

  if (type === "message" && !newMessageSound) return;
  if (type === "notification" && !appNotificationSound) return;

  try {
    const audio = getAudio(type);
    audio.currentTime = 0; // 처음부터 재생
    audio.play().catch((err) => {
      console.warn(`Failed to play ${type} sound:`, err);
    });
  } catch (err) {
    console.warn(`Failed to play ${type} sound:`, err);
  }
}
