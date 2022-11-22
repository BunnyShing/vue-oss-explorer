import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'
import vue2 from '@vitejs/plugin-vue2'
var path = require('path')

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: "vue-oss-explorer", //输出文件名称
    lib: {
      entry: path.resolve(__dirname, "./index.js"), //指定组件编译入口文件
      name: "vue-oss-explorer",
      fileName: "vue-oss-explorer",
    }, //库编译模式配置
    rollupOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      external: ["vue"],
      output: {
        // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
        globals: {
          vue: "Vue",
        },
      },
    }, // rollup打包配置
  },
  plugins: [
    vue2(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
