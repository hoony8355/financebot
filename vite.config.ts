
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  // 현재 작업 디렉토리(process.cwd())에서 .env 파일 및 환경변수를 로드합니다.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    // 클라이언트(브라우저) 코드에서 process.env.API_KEY를 실제 값으로 치환합니다.
    // 'Live Test' 기능이 브라우저에서 작동하려면 이 설정이 필수적입니다.
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          // 정적 HTML 파일들이 빌드된 JS/CSS를 찾을 수 있도록 파일명에서 해시 제거
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
          // 벤더 라이브러리를 별도 파일로 분리하여 로딩 속도와 캐싱 효율을 높입니다.
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-helmet-async', 'recharts', 'marked', '@google/genai']
          }
        }
      }
    }
  };
});
