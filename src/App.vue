<template>
  <div id="app">
    {{msg}}
    <vue-oss-explorer :oss-config="ossConfig"></vue-oss-explorer>
  </div>
</template>

<script>
  import VueOssExplorer from '@/components/VueOssExplorer.vue'

  export default {
    name: 'app',
    components:{VueOssExplorer},
    data () {
      return {
        msg: 'OSS文件管理器Demo',
        ossConfig: {
          region: 'oss-cn-shenzhen',
          accessKeyId: '', // STS接口返回的临时accessKeyId
          accessKeySecret: '', // STS接口返回的临时accessKeySecret
          stsToken:'',
          bucket: '', // Bucket
        }
      }
    },
    methods:{
    }
  }
</script>

<style lang="scss">
</style>
