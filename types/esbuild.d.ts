declare module 'esbuild' {
  export function transform(input: string, options?: any): Promise<{ code: string; map?: string | object }>;
  export function build(options: any): Promise<any>;
  export function stop(): void;
  const esbuild: any;
  export default esbuild;
}
