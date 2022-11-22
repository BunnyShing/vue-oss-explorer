# vue-oss-explorer
![npm](https://img.shields.io/npm/dt/vue-oss-explorer.svg)
![NPM](https://img.shields.io/npm/l/vue-oss-explorer)
![npm](https://img.shields.io/npm/v/vue-oss-explorer)

> 基于Vue + ElementUI的OSS Web文件管理器Vue组件
> 该组件是[oss-file-manager](https://www.npmjs.com/package/oss-file-manager)的重构版本

## 安装

``` bash
npm i vue-oss-explorer -S
```

## 引入
```javascript
import Vue from 'vue'
import VueOssExplorer from 'vue-oss-explorer'

Vue.use(VueOssExplorer)
```

## 使用
```html
<!-- 调用示例 -->
<vue-oss-explorer
    @uploadSuccess="上传成功回调"
    @removeSuccess="删除成功回调"
    @renameSuccess="重命名成功回调"
    oss-config="OSS Client配置，详见：https://help.aliyun.com/document_detail/64095.html"
    root-path="指定根目录">
</vue-oss-explorer>
```
> 强烈建议通过OSS STS临时访问凭证来调用。  
> 暴露OSS长期密钥到前端存在巨大安全风险，详见：https://help.aliyun.com/document_detail/100624.htm

## 属性
| 参数 | 说明 | 类型 | 可选值 | 默认值	|
| :---- | :---- | :----: | :----: | :----: |
oss-config | OSS Client配置 | Object | 详见：[OSS官方配置文档](https://help.aliyun.com/document_detail/64095.html) | -
root-path | 指定根目录 | String | - | 空 
allow-upload-folder | 是否允许上传文件夹 | Boolean | true/false | true 
preview-expires | 预览地址过期时间，单位：秒 | Number | - | 86400 
allow-delete | 是否允许删除文件，该参数仅控制前端隐藏按钮。建议开发者定义好STS权限策略才能真正阻止用户删除操作 | Boolean | true/false | true 
before-upload | 自定义上传文件前置函数，入参为上传的文件对象，返回false或返回Promise且被reject，则终止上传 | Function(file) | - | - 
headers | 上传时的请求头，透传给OSS Client 详见：https://help.aliyun.com/document_detail/383952.html | Object | - | - 
callback | 异步回调配置，透传给OSS Client 详见：https://help.aliyun.com/document_detail/383952.html | Object | - | -

## 事件
| 事件名 | 说明 | 参数 |
| :---- | :---- | :---- |
previewObject | 预览对象回调 | (previewUrl: OSS文件预览地址)
listObjectsFail | 获取对象列表失败回调 | (err: 错误信息)
uploadSuccess | 上传成功回调 | (res: OSS API 返回上传结果对象)
uploadFail | 上传失败回调 | (err: 错误信息)
removeSuccess | 删除成功回调 | (path: 对象OSS路径)
removeFail | 删除失败回调 | (err: 错误信息)
renameSuccess | 重命名成功回调 | (newPath: 对象新OSS路径,oldPath: 对象旧OSS路径)
renameFail | 重命名失败回调 | (err: 错误信息)
> 如果定义了previewObject事件，则不会触发文件预览，而是返回OSS对象预览地址给开发者  
开发者可根据对象地址来进行后续业务处理