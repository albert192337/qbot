import { MESSAGE_DURATION_MS, parseMessage, type PetMessage } from '../shared/pet-message';
let message: PetMessage | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let publish: (message: PetMessage | null) => void = () => {};
export function onPetMessageChanged(callback: typeof publish): void { publish = callback; }
export function getPetMessage(): PetMessage | null {
  if (message && message.expiresAt <= Date.now()) clearPetMessage();
  return message;
}
export function clearPetMessage(): void {
  clearTimeout(timer); timer = undefined; message = null; publish(null);
}
export function leavePetMessage(value: unknown, characterId?: string): void {
  const text = parseMessage(value);
  if (!text) return;
  if (getPetMessage()?.text === text && message?.characterId === characterId) return;
  clearTimeout(timer);
  message = { text, characterId, expiresAt: Date.now() + MESSAGE_DURATION_MS };
  timer = setTimeout(clearPetMessage, MESSAGE_DURATION_MS);
  timer.unref?.();
  publish(message);
}
