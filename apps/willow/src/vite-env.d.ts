/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SIMPLEX_URL: string;
  readonly VITE_OLLAMA_URL: string;
  readonly VITE_OLLAMA_MODEL: string;
  readonly VITE_PHOS_HMAC_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
