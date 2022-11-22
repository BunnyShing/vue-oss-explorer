import VueOssExplorer from './src/components/VueOssExplorer.vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css';

const install = function (Vue, opts = {}) {
  Vue.component(VueOssExplorer.name, VueOssExplorer);
  Vue.use(ElementUI)
};
// 能够根据实际状况，是否须要这段代码（CDN引入，即可使用全部组件）
if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue);
}
export default install
