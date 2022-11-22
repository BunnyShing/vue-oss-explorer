<template>
  <div v-loading="loading">
    <div style="display: flex;margin:0.5rem 0;">
      <el-button icon="el-icon-back" size="mini" style="padding: 0 0.5rem;" v-if="path !== rootPath" @click="back"></el-button>
      <el-button icon="el-icon-refresh" size="mini" style="padding: 0 0.5rem;" @click="refresh"></el-button>
      <div style="padding: 0.2rem 0rem;margin: 0 0.5rem;">当前目录路径：</div>
      <div
        style="width: 65%;box-shadow: inset 0 1px 4px rgba(0,0,0,0.2);border-radius: 5px;padding: 0 0.5rem;font-size: 1rem;display: inline-flex;vertical-align: middle;align-items:center;">
        <el-link @click="path = rootPath"><i class="el-icon-house"></i></el-link>
        <div style="margin: 0 0.4rem;">/</div>
        <div v-for="(item,index) in path.split('/')" :key="index" style="display: inline-flex;">
          <el-link
            @click="path = path.slice(0,path.lastIndexOf(item + '/') + (item + '/').length)">
            {{item}}
          </el-link>
          <div style="margin: 0 0.4rem;">{{ item ? ' / ' : '' }}</div>
        </div>
      </div>
      <el-popover title="上传列表" trigger="hover">
        <el-table :data="uploadingList">
          <el-table-column label="文件名称" width="350" prop="fileName"></el-table-column>
          <el-table-column label="上传进度" width="100">
            <template slot-scope="{row}">
              <el-progress type="circle" :percentage="Number(row.progress)" :width="50"></el-progress>
            </template>
          </el-table-column>
        </el-table>
        <el-button slot="reference" size="mini" type="primary" style="margin: 0 0.5rem;">
          {{uploadingList.length > 0 ? '正在上传：' + uploadingList.length : '上传列表'}}
        </el-button>
      </el-popover>
    </div>
    <div style="display: flex;">
      <el-button v-show="allowUploadFolder" size="mini" @click="createDir">创建文件夹</el-button>
      <el-upload ref="uploadFolder" :http-request="handleUpload" action multiple :show-file-list="false">
        <el-button v-show="allowUploadFolder" size="mini" @click="uploadFolder" style="margin: 0 0.5rem;">上传文件夹</el-button>
      </el-upload>
      <el-upload ref="uploadFile" :http-request="handleUpload" action multiple :show-file-list="false">
        <el-button size="mini">上传文件</el-button>
      </el-upload>
    </div>
    <el-table style="min-height: 100vh" :data="list" id="draggle-area" v-loading="dragCover"
              element-loading-background="rgba(0, 0, 0, 0.5)" element-loading-text="松开上传"
              element-loading-spinner="el-icon-upload2">
      <el-table-column label="名称">
        <template slot-scope="{row}">
          <el-link @click="row.size ? preview(row.name) : path = row.name">{{ getPlainObjectName(row.name) }}</el-link>
        </template>
      </el-table-column>
      <el-table-column label="类型/大小" width="150" prop="size"
                       :formatter="row => row.name.endsWith('/') ? '文件夹' : parseFloat(row.size / 1024).toFixed(2) + 'KB'">
      </el-table-column>
      <el-table-column label="最后修改时间" width="180" prop="lastModified"
                       :formatter="row => row.lastModified ? parseTime(new Date(row.lastModified)) : ''">
      </el-table-column>
      <el-table-column label="操作" align="center" width="100">
        <template slot-scope="{row}">
          <el-dropdown>
            <div>
              <el-button icon="el-icon-edit-outline" size="mini"></el-button>
            </div>
            <el-dropdown-menu slot="dropdown" style="text-align: center">
              <el-dropdown-item>
                <el-button @click="rename(row.name)" size="mini">重命名</el-button>
              </el-dropdown-item>
              <el-dropdown-item v-if="allowDelete">
                <el-button type="danger" @click="remove([row.name])" size="mini">删除</el-button>
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </template>
      </el-table-column>
    </el-table>
    <div v-show="next" style="text-align: center;margin: 1rem auto;">
      <el-link><span @click="fetch">点击加载更多</span></el-link>
    </div>
  </div>
</template>

<script>
  import OSS from 'ali-oss'

  export default {
    name: 'VueOssExplorer',
    props: {
      // OSS Client配置，请根据https://help.aliyun.com/document_detail/64095.html配置
      ossConfig: {
        type: Object,
        default: {
          region: null,  // 区域
          accessKeyId: '', // STS接口返回的临时accessKeyId
          accessKeySecret: '', // STS接口返回的临时accessKeySecret
          stsToken: '', // STS接口返回的securityToken
          bucket: '', // Bucket
          endpoint: null,
          secure: true
        }
      },
      // 指定根目录
      rootPath: {
        type: String,
        default: '',
      },
      // 是否允许创建/上传文件夹
      allowUploadFolder: {
        type: Boolean,
        default: true,
      },
      // 预览地址过期时间，单位：秒
      previewExpires: {
        type: Number,
        default: 86400,
      },
      // 是否允许删除文件，该参数仅控制前端隐藏按钮。建议开发者定义好STS权限策略，才能真正阻止用户删除操作
      allowDelete: {
        type: Boolean,
        default: true,
      },
      // 自定义上传前置函数，返回false或reject将终止上传
      beforeUpload: {
        type: Function,
      },
      // 上传时的请求头，透传给OSS Client 详见：https://help.aliyun.com/document_detail/383952.html
      headers: {
        type: Object,
      },
      // 异步回调配置，透传给OSS Client 详见：https://help.aliyun.com/document_detail/383952.html
      callback: {
        type: Object,
      }
    },
    data() {
      return {
        ossClient: null,
        dragCover: false,
        loading: false,
        uploadingList: [],
        list: [],
        path: this.rootPath,
        next: null,

      }
    },
    mounted() {
      this.refresh()
      // 1.文件第一次进入拖动区时，触发 dragging 事件
      // 2.文件在拖动区来回拖拽时，不断触发 dragging 事件
      // 3.文件已经在拖动区，并松开鼠标时，触发 dragFinish 事件
      // 4.文件在拖动区来回拖拽时，不断触发 dragCancel 事件
      let dropBox = document.getElementById('draggle-area');
      dropBox.addEventListener("drop", this.dragFinish, false)
      dropBox.addEventListener("dragleave", this.dragCancel, false)
      dropBox.addEventListener("dragenter", this.dragging, false)
      dropBox.addEventListener("dragover", this.dragging, false)
    },
    watch: {
      ossConfig: {
        handler(newOssConfig) {
          if(newOssConfig && newOssConfig.accessKeyId){
            this.ossClient = new OSS(newOssConfig)
            this.refresh()
          }
        },
        deep: true,
        immediate: true,
      },
      path() {
        this.refresh()
      },
    },
    methods: {
      refresh() {
        this.list = []
        this.next = null
        this.fetch()
      },
      fetch() {
        this.loading = true
        this.ossClient && this.ossClient.list({
          'prefix': this.path,
          'marker': this.next,
          'delimiter': '/'
        })
          .then(res => {
            this.next = res.nextMarker
            res.prefixes && res.prefixes.map(v => this.list.push({name: v, size: 0, lastModified: ''}))
            res.objects && res.objects.filter(k => !k.name.endsWith('/')).map(v => this.list.push(v))
            // 按时间排序
            this.list.sort((a, b) => {
              let [ta, tb] = [new Date(a.lastModified), new Date(b.lastModified)]
              return ta < tb ? 1 : ta > tb ? -1 : 0
            })
          })
          .catch(err => {
            if (this.$listeners['listObjectsFail']) {
              this.$emit('listObjectsFail', err);
            } else {
              this.$message.error(err.toString())
            }
          })
          .finally(() => this.loading = false)
      },
      dragging(e) {
        this.dragCover = true
        this.preventDefault(e)
      },
      dragCancel(e) {
        this.dragCover = false
        this.preventDefault(e)
      },
      dragFinish(e) {
        this.dragCover = false
        this.preventDefault(e)
        let that = this
        let items = e.dataTransfer.items;
        if (items && items.length && items[0].webkitGetAsEntry != null) {
          addFilesItems(items);
        }

        function addFilesItems(items) {
          let ret = [];
          for (let i = 0; i < items.length; i++) {
            let item = items[i];
            let entry;
            if (item.webkitGetAsEntry && (entry = item.webkitGetAsEntry())) {
              // 上传文件
              if (entry.isFile) {
                // 写入上传文件的逻辑，调用上传接口
                entry.file(fileData => {
                  that.multipartUpload(fileData)
                })
              } else if (entry.isDirectory) {
                // 上传文件夹
                if (!that.allowUploadFolder) {
                  that.$message.error("文件夹[" + entry.name + "]上传失败，不允许上传文件夹")
                } else {
                  ret.push(addFilesFormDirectory(entry, entry.name));
                }
              }
            }
          }
        }

        function addFilesFormDirectory(directory, path) {
          directory.createReader().readEntries(entries => {
            entries.forEach(entry => {
              // 判断是否是文件
              if (entry.isFile) {
                entry.file(fileData => {
                  // 用fullPath的值来代替webkitRelativePath
                  fileData.fullPath = path + "/" + fileData.name;
                  that.multipartUpload(fileData)
                })
              } else if (entry.isDirectory) {
                // 如果还是文件夹,则递归处理
                addFilesFormDirectory(entry, path + "/" + entry.name);
              }
            })
          })
        }
      },
      preventDefault(e) {
        e.stopPropagation();
        e.preventDefault();
      },
      handleUpload(file) {
        file.file.fullPath = file.file.webkitRelativePath || ''
        this.multipartUpload(file.file)
      },
      async multipartUpload(file) {
        if (this.beforeUpload && typeof this.beforeUpload === 'function') {
          try {
            if (await this.beforeUpload(file) === false) return;
          } catch (err) {
            return;
          }
        }
        let name = this.path + (file.fullPath && file.fullPath !== '' ? file.fullPath : file.name);
        this.$message.info(this.getPlainObjectName(name) + ' 已加入上传列表')
        let options = {
          // 获取分片上传进度、断点和返回值。
          progress: (p, cpt) => {
            if (p >= 1) {
              if (name.startsWith(this.path)) {
                let newObjectName = this.path + name.replace(this.path,'').split('/')[0]
                newObjectName = newObjectName.indexOf('.') === -1 ? newObjectName + '/' : ''
                if(this.list.findIndex(v => v.name === newObjectName) === -1){
                  this.list.unshift({name: newObjectName, size: newObjectName.indexOf('.') === -1 ? 0 : file.size, lastModified: new Date()})
                }
              }
              this.$message.success(this.getPlainObjectName(name) + '已上传完成')
            }
            if (cpt) {
              let progressData = {progress: parseFloat(p * 100).toFixed(2), fileName: name, uploadId: cpt.uploadId}
              let index = this.uploadingList.findIndex(v => v.uploadId === cpt.uploadId)
              if (index === -1) {
                this.uploadingList.push(progressData)
              } else {
                if (p >= 1) {
                  this.uploadingList.splice(index, 1)
                } else {
                  this.uploadingList.splice(index, 1, progressData)
                }
              }
            }
          },
          headers: this.headers,
          callback: this.callback,
          parallel: 10,// 设置并发上传的分片数量。
          partSize: 1024 * 1024 * 5,// 设置分片大小。默认值为1 MB，最小值为100 KB。
          mime: file.type,
        };
        try {
          // 分片上传。
          let res = await this.ossClient.multipartUpload(name, file, options);
          this.$emit('uploadSuccess', res)
        } catch (err) {
          if (this.$listeners['uploadFail']) {
            this.$emit('uploadFail', err);
          } else {
            this.$message.error(err.toString())
          }
        }
      },
      remove(objectNameArr) {
        this.$confirm('此操作将永久删除选中文件/文件夹, 是否继续?', '提示')
          .then(async () => {
            this.loading = true
            let objectsTarget = [];
            for (let item of objectNameArr) {
              // 判断对象是否以斜杠结尾，如果是，则代表是一个目录，就需要把该目录开头的OSS对象都查出来一并删除
              if (item.endsWith('/')) {
                objectsTarget.push(...await this.getDirObjects(item, null))
              }
              objectsTarget.push(item)
            }
            await this.ossClient.deleteMulti(objectsTarget)
            let deletedObjectArr = [...new Set(objectsTarget)]
            deletedObjectArr.map(path => {
              // 过滤掉已被删除的对象
              this.list = this.list.filter(v => v.name !== path)
              this.$emit('removeSuccess', path)
            })
            this.$message.success('删除成功')
          })
          .catch(err => {
            if (err === 'cancel') {
              this.$message.info('取消删除')
            } else {
              if (this.$listeners['removeFail']) {
                this.$emit('removeFail', err);
              } else {
                this.$message.error(err.toString())
              }
            }
          })
          .finally(() => this.loading = false)
      },
      rename(objectName) {
        this.$prompt('如对大文件夹重命名是耗时操作，确认后请耐心等候', '重命名', {
          inputValue: this.getPlainObjectName(objectName),
          inputPattern: /^[^/:*?"<>|]+$/,
          inputErrorMessage: '非法文件/文件夹名称'
        }).then(async ({value}) => {
          this.loading = true
          let copyTarget = await this.getDirObjects(objectName, null)
          let pathForReplace = objectName.split('/').filter(s => s && s.trim()).slice(0, -1).join('/') + '/' + value + (objectName.endsWith('/') ? '/' : '');
          for (let oldPath of copyTarget) {
            let newPath = oldPath.replace(objectName, pathForReplace); //把最后一个元素替换为新的命名 .push(oldPath.endsWith('/') ? '' : value)
            let copyResult = await this.ossClient.copy(newPath, oldPath)
            if (copyResult.res.status === 200) {
              await this.ossClient.delete(oldPath)
              let oldObject = this.list.find(v => v.name === oldPath);
              if (oldObject) {
                oldObject.name = newPath
              }
              this.$emit('renameSuccess', newPath, oldPath);
            }
          }
        }).catch(err => {
          if (err === 'cancel') {
            this.$message.info('取消重命名')
          } else {
            if (this.$listeners['renameFail']) {
              this.$emit('renameFail', err);
            } else {
              this.$message.error(err.toString())
            }
          }
        }).finally(() => this.loading = false)
      },
      // 递归获取指定目录下的全部对象
      async getDirObjects(objectName, nextMarker) {
        let objects = []
        let res = await this.ossClient.list({'prefix': objectName, 'max-keys': 1000, 'marker': nextMarker})
        objects.push(...res.objects.map(v => {
          return v.name
        }))
        if (res.nextMarker) {
          objects.push(...await this.getDirObjects(objectName, res.nextMarker))
        }
        return objects;
      },
      createDir() {
        this.$prompt('请输入文件夹名称', '新建文件夹', {
          inputPattern: /^[^/:*?"<>|]+$/,
          inputErrorMessage: '非法文件夹名称'
        }).then(async ({value}) => {
          try {
            let dirPath = this.path + value + '/'
            await this.ossClient.put(dirPath, Buffer.from(''));
            this.list.unshift({name: dirPath, size: '', lastModified: ''})
            this.$message.success("创建文件夹成功");
          } catch (err) {
            this.$message.error(err.toString())
          }
        }).catch(err => {
          if (err === 'cancel') {
            this.$message.info('取消创建文件夹')
          } else {
            this.$message.error(err.toString())
          }
        });
      },
      getPlainObjectName(name) {
        return name.split('/').slice(name.endsWith('/') ? -2 : -1)[0]
      },
      uploadFolder() {
        this.$nextTick(() => this.$refs.uploadFolder.$children[0].$refs.input.webkitdirectory = true)
      },
      preview(objectFullPath) {
        let previewUrl = this.ossClient.signatureUrl(objectFullPath, {expires: this.previewExpires})
        this.$listeners['previewObject'] ? this.$emit('previewObject', previewUrl) : window.open(previewUrl);
      },
      back() {
        let backPath = this.path.split('/').slice(0, -2).join('/')
        this.path = backPath ? backPath + '/' : ''
      },
      parseTime(time, format = '{y}-{m}-{d} {h}:{i}:{s}') {
        if (arguments.length === 0 || !time) return null
        let date = time
        if (typeof time !== 'object') {
          if ((typeof time === 'string')) {
            if (/^[0-9]+$/.test(time)) {
              time = parseInt(time) // support "1548221490638"
            } else {
              time = time.replace(new RegExp(/-/gm), '/') // support safari[https://stackoverflow.com/questions/4310953/invalid-date-in-safari]
            }
          }
          if ((typeof time === 'number') && (time.toString().length === 10)) time = time * 1000
          date = new Date(time)
        }
        const formatObj = {
          y: date.getFullYear(),
          m: date.getMonth() + 1,
          d: date.getDate(),
          h: date.getHours(),
          i: date.getMinutes(),
          s: date.getSeconds(),
          a: date.getDay()
        }
        return format.replace(/{([ymdhisa])+}/g, (result, key) => {
          const value = formatObj[key]
          // Note: getDay() returns 0 on Sunday
          return (key === 'a') ? ['日', '一', '二', '三', '四', '五', '六'][value] : value.toString().padStart(2, '0')
        })
      }
    }
  }
</script>
