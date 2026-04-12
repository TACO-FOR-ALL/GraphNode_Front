import { useSettingsStore } from "@/store/useSettingsStore";

const WEB_SETTINGS_STORAGE_KEY = "graphnode-web-settings";

describe("useSettingsStore", () => {
  const originalSystemAPI = (window as any).systemAPI;

  beforeEach(() => {
    localStorage.clear();
    delete (window as any).systemAPI;
    useSettingsStore.setState({ desktopNotification: true });
  });

  afterAll(() => {
    (window as any).systemAPI = originalSystemAPI;
  });

  test("웹에서는 desktopNotification 설정을 localStorage에 저장", () => {
    useSettingsStore.getState().setDesktopNotification(false);

    expect(localStorage.getItem(WEB_SETTINGS_STORAGE_KEY)).toBe(
      JSON.stringify({ desktopNotification: false }),
    );
    expect(useSettingsStore.getState().desktopNotification).toBe(false);
  });

  test("웹에서는 저장된 desktopNotification 설정을 로드", async () => {
    localStorage.setItem(
      WEB_SETTINGS_STORAGE_KEY,
      JSON.stringify({ desktopNotification: false }),
    );

    await useSettingsStore.getState().loadSettings();

    expect(useSettingsStore.getState().desktopNotification).toBe(false);
  });
});
