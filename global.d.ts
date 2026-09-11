declare module '*.css';
// global.d.ts
declare module "tailwindcss" {
  export type Config = {
    content?: string[];
    theme?: Record<string, unknown>;
    plugins?: unknown[];
    [key: string]: unknown;
  };
}