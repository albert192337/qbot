import { existsSync } from 'node:fs';
import path from 'node:path';
import type { SteamNative } from './service';

/** Valve flat C API only. Never initialize steamworks.js alongside this manual callback pump. */
export function createSteamNative(options: {
  sdkRoot?: string;
  avatar?: (rgba: Buffer, width: number, height: number) => string;
} = {}): SteamNative {
  // Lazy require keeps normal/offline builds independent of native Steam initialization.
  const koffi: typeof import('koffi') = require('koffi');
  const platform = process.platform;
  const arch = process.arch;
  const relative = platform === 'darwin' ? 'osx/libsteam_api.dylib'
    : platform === 'win32' && arch === 'x64' ? 'win64/steam_api64.dll'
    : platform === 'linux' && arch === 'x64' ? 'linux64/libsteam_api.so'
    : platform === 'linux' && arch === 'arm64' ? 'linuxarm64/libsteam_api.so' : '';
  if (!relative) throw new Error(`不支持的 Steam 平台：${platform}/${arch}`);
  const root = options.sdkRoot
    ? path.join(path.resolve(options.sdkRoot), 'redistributable_bin')
    : path.join(path.dirname(require.resolve('steamworks.js/package.json')), 'dist');
  const library = path.join(root, relative).replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep);
  if (!existsSync(library)) throw new Error('缺少 Steam 原生库，请设置 QBOT_STEAM_SDK 指向官方 SDK 的 sdk 目录');
  const lib = koffi.load(library);
  const bind = (definition: string) => lib.func(definition);
  const api = {
    init: bind('int SteamAPI_InitFlat(void *error)'),
    shutdown: bind('void SteamAPI_Shutdown()'),
    user: bind('void *SteamAPI_SteamUser_v023()'),
    friends: bind('void *SteamAPI_SteamFriends_v017()'),
    utils: bind('void *SteamAPI_SteamUtils_v010()'),
    apps: bind('void *SteamAPI_SteamApps_v008()'),
    appId: bind('uint32 SteamAPI_ISteamUtils_GetAppID(void *self)'),
    online: bind('bool SteamAPI_ISteamUser_BLoggedOn(void *self)'),
    id: bind('uint64 SteamAPI_ISteamUser_GetSteamID(void *self)'),
    name: bind('const char *SteamAPI_ISteamFriends_GetPersonaName(void *self)'),
    count: bind('int SteamAPI_ISteamFriends_GetFriendCount(void *self, int flags)'),
    friend: bind('uint64 SteamAPI_ISteamFriends_GetFriendByIndex(void *self, int index, int flags)'),
    friendName: bind('const char *SteamAPI_ISteamFriends_GetFriendPersonaName(void *self, uint64 id)'),
    state: bind('int SteamAPI_ISteamFriends_GetFriendPersonaState(void *self, uint64 id)'),
    image: bind('int SteamAPI_ISteamFriends_GetSmallFriendAvatar(void *self, uint64 id)'),
    imageSize: bind('bool SteamAPI_ISteamUtils_GetImageSize(void *self, int image, void *width, void *height)'),
    imageData: bind('bool SteamAPI_ISteamUtils_GetImageRGBA(void *self, int image, void *dest, int size)'),
    invite: bind('bool SteamAPI_ISteamFriends_InviteUserToGame(void *self, uint64 id, const char *command)'),
    presence: bind('bool SteamAPI_ISteamFriends_SetRichPresence(void *self, const char *key, const char *value)'),
    clear: bind('void SteamAPI_ISteamFriends_ClearRichPresence(void *self)'),
    launch: bind('int SteamAPI_ISteamApps_GetLaunchCommandLine(void *self, void *buffer, int length)'),
    dispatchInit: bind('void SteamAPI_ManualDispatch_Init()'),
    pipe: bind('int SteamAPI_GetHSteamPipe()'),
    frame: bind('void SteamAPI_ManualDispatch_RunFrame(int pipe)'),
    next: bind('bool SteamAPI_ManualDispatch_GetNextCallback(int pipe, void *message)'),
    free: bind('void SteamAPI_ManualDispatch_FreeLastCallback(int pipe)'),
  };
  let initialized = false;
  let user: unknown, friends: unknown, utils: unknown, apps: unknown;
  let pipe = 0;
  let previousAppId: string | undefined;
  let previousGameId: string | undefined;
  let envSet = false;
  const images = new Map<string, string>();
  const avatar = (id: bigint): string | undefined => {
    if (!options.avatar) return;
    const handle = api.image(friends, id);
    if (handle <= 0) return;
    const key = `${id}:${handle}`;
    if (images.has(key)) return images.get(key);
    const width = Buffer.alloc(4), height = Buffer.alloc(4);
    if (!api.imageSize(utils, handle, width, height)) return;
    const w = width.readUInt32LE(), h = height.readUInt32LE();
    if (!w || !h || w > 256 || h > 256) return;
    const rgba = Buffer.alloc(w * h * 4);
    if (!api.imageData(utils, handle, rgba, rgba.length)) return;
    const data = options.avatar(rgba, w, h);
    if (images.size >= 256) images.delete(images.keys().next().value!);
    images.set(key, data);
    return data;
  };
  const shutdown = () => {
    if (initialized) { try { if (friends) api.clear(friends); } finally { api.shutdown(); initialized = false; } }
    images.clear();
    if (envSet) {
      if (previousAppId === undefined) delete process.env.SteamAppId; else process.env.SteamAppId = previousAppId;
      if (previousGameId === undefined) delete process.env.SteamGameId; else process.env.SteamGameId = previousGameId;
      envSet = false;
    }
    // Keep the library mapped: Steam can retain internal worker references after Shutdown.
  };
  return {
    init(appId) {
      previousAppId = process.env.SteamAppId; previousGameId = process.env.SteamGameId;
      process.env.SteamAppId = String(appId); process.env.SteamGameId = String(appId); envSet = true;
      const error = Buffer.alloc(1024);
      const result = api.init(error);
      if (result !== 0) { shutdown(); throw new Error(error.toString('utf8').split('\0')[0] || `初始化错误 ${result}`); }
      initialized = true;
      user = api.user(); friends = api.friends(); utils = api.utils(); apps = api.apps();
      if (!user || !friends || !utils || !apps) { shutdown(); throw new Error('Steam SDK 接口不可用'); }
      if (api.appId(utils) !== appId) { shutdown(); throw new Error('Steam 当前 AppID 与配置不一致'); }
      api.clear(friends); api.dispatchInit(); pipe = api.pipe();
    },
    read() {
      if (!initialized) throw new Error('Steam 尚未初始化');
      const online = !!api.online(user);
      const id = BigInt(api.id(user));
      const count = online ? Math.max(0, Math.min(2000, api.count(friends, 4))) : 0;
      const list = Array.from({ length: count }, (_, index) => {
        const friendId = BigInt(api.friend(friends, index, 4));
        return { steamId: friendId.toString(), name: String(api.friendName(friends, friendId)).slice(0, 128),
          state: Number(api.state(friends, friendId)), avatar: index < 150 ? avatar(friendId) : undefined };
      });
      return { online, self: { steamId: id.toString(), name: String(api.name(friends)).slice(0, 128), avatar: online ? avatar(id) : undefined }, friends: list };
    },
    pump(onJoin) {
      if (!initialized) return;
      api.frame(pipe);
      // CallbackMsg_t: int user, int callback, pointer data, int dataSize (all supported targets are 64-bit).
      const message = Buffer.alloc(24);
      for (let i = 0; i < 256 && api.next(pipe, message); i++) {
        try {
          const callback = message.readInt32LE(4);
          const size = message.readInt32LE(16);
          if (callback === 337 && size >= 264) {
            // GameRichPresenceJoinRequested_t: uint64 friend followed by char connect[256].
            const pointer = koffi.decode(message, 8, 'void *');
            const data = Buffer.from(koffi.decode(pointer, 'uint8', 264));
            const command = data.subarray(8, 264).toString('utf8').split('\0')[0];
            onJoin(command, data.readBigUInt64LE(0).toString());
          }
        } finally { api.free(pipe); }
      }
    },
    launchCommand() {
      if (!initialized) return '';
      const buffer = Buffer.alloc(1024);
      api.launch(apps, buffer, buffer.length);
      return buffer.toString('utf8').split('\0')[0].trim();
    },
    setConnect(command) {
      if (!initialized) return;
      if (!command) api.clear(friends);
      else if (!api.presence(friends, 'connect', command)) throw new Error('Steam 未能更新房间邀请状态');
    },
    invite(id, command) { return initialized && !!api.invite(friends, BigInt(id), command); },
    shutdown,
  };
}
