// popupが使うChrome APIの範囲。権限とPromiseの既存契約を表す。
declare const chrome: {
  storage: { local: {
    get(defaults: Record<string, unknown>): Promise<Record<string, unknown>>;
    set(values: Record<string, unknown>): Promise<void>;
  } };
  tabs: { query(options: { active: boolean; lastFocusedWindow: boolean }): Promise<readonly { url?: string }[]> };
};
