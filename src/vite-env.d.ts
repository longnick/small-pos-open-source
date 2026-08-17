/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POS_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
