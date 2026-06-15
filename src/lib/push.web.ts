// 웹 스텁: 웹은 푸시 미지원이라 no-op. (네이티브 expo-notifications를 웹 번들에 import하지 않기 위함)
export async function registerPush(_userId: string): Promise<void> {}
export async function unregisterPush(): Promise<void> {}
