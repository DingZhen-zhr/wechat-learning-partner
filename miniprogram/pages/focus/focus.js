const app = getApp();

Page({
  data: {
    // --- 原有模板数据 ---
    type: "",
    envId: "",
    showTip: false,
    title: "",
    content: "",
    haveGetOpenId: false,
    openId: "",
    haveGetCodeSrc: false,
    codeSrc: "",
    haveGetRecord: false,
    record: [],
    haveGetImgSrc: false,
    imgSrc: "",
    showInsertModal: false,
    insertRegion: "",
    insertCity: "",
    insertSales: "",
    haveGetCallContainerRes: false,
    callContainerResStr: "",
    callcbrCode: "",
    initEnvCode: "",
    callOpenIdCode: "",
    callMiniProgramCode: "",
    callFunctionCode: "",
    callCreateCollectionCode: "",
    callUploadFileCode: "",
    
    // --- 新增的“专注学习”功能数据 ---
    subject: '未知科目', 
    initialTime: 25 * 60, 
    partnerAvatar: '/images/icons/doubao.png',
    showBubble: false,
    bubbleText: '',
    bubbleTimer: null,
    bubbleMessages: [
      '你已经专注 20 分钟了，继续保持哟！',
      '喝口水再继续吧？',
      '感觉怎么样？休息一下眼睛吧！',
      '坚持就是胜利，加油！',
      '目标就在前方，冲鸭！'
    ],
    showSummaryModal: false,
    finalStudyDuration: '00:00:00',
    totalSecondsStudied: 0,
    heartBeat: false 
  },

  /**
   * 页面加载，整合了原有逻辑和新功能
   */
  onLoad(options) {
    // --- 新增：处理从计划页传递过来的专注学习参数 ---
    if (options.subject) {
      this.setData({ subject: decodeURIComponent(options.subject) });
    }
    if (options.duration) {
      this.setData({ initialTime: parseInt(options.duration) * 60 });
    }
    // 启动专注模式下的搭子互动气泡
    this.startBubbleTimer();

    // --- 保留：原有模板的 onLoad 逻辑 ---
    if (options?.type) {
      this.setData({ type: options.type, envId: options.envId });
      if (options.type === "cloudbaserunfunction" || options.type === "cloudbaserun") {
        this.getCallcbrCode();
      }
      if (options.type === "getOpenId") {
        this.getOpenIdCode();
      }
      if (options.type === "getMiniProgramCode") {
        this.getMiniProgramCode();
      }
      if (options.type === "createCollection") {
        this.getCreateCollectionCode();
      }
      if (options.type === "uploadFile") {
        this.getUploadFileCode();
      }
    }
  },

  onUnload() {
    if (this.data.bubbleTimer) {
      clearInterval(this.data.bubbleTimer);
    }
  },



  startBubbleTimer() {
    const bubbleInterval = 20000; // 20秒
    const timer = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * this.data.bubbleMessages.length);
      const randomMessage = this.data.bubbleMessages[randomIndex];
      this.setData({
        bubbleText: randomMessage,
        showBubble: true
      });
      setTimeout(() => {
        this.setData({ showBubble: false });
      }, 5000); // 5秒后消失
    }, bubbleInterval);
    this.setData({ bubbleTimer: timer });
  },

  onTimeUpdate(e) {
    this.setData({ totalSecondsStudied: e.detail.totalSeconds });
  },

  onFinish() {
    console.log('计时完成！');
    this.showSummary();
  },

  handleManualFinish() {
    const timerComponent = this.selectComponent('.study-timer'); // 通过 class 获取组件实例
    if (timerComponent) {
      timerComponent.stopTimer();
    }
    this.showSummary();
  },

  showSummary() {
    if (this.data.bubbleTimer) {
      clearInterval(this.data.bubbleTimer);
    }
    const duration = this.formatDuration(this.data.totalSecondsStudied);
    this.setData({
      finalStudyDuration: duration,
      showSummaryModal: true
    });
  },

  closeSummaryModal() {
    this.setData({ showSummaryModal: false });
    this.updatePlanProgress();
    wx.navigateBack();
  },

  formatDuration(seconds) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  },

  updatePlanProgress() {
    const eventChannel = this.getOpenerEventChannel();
    if (eventChannel && eventChannel.emit) {
      eventChannel.emit('acceptStudyRecord', { 
        subject: this.data.subject,
        duration: this.data.totalSecondsStudied
      });
      console.log('学习记录已通过EventChannel发送');
    } else {
      console.warn('无法获取 EventChannel，学习记录将保存至全局变量');
      if (!app.globalData.studyRecords) {
        app.globalData.studyRecords = [];
      }
      app.globalData.studyRecords.push({
        subject: this.data.subject,
        duration: this.data.totalSecondsStudied
      });
    }
  },






  handleBubbleFeedback() {
    // 触发爱心跳动动画
    this.setData({ heartBeat: true });
    
    // 动画结束后重置状态，以便下次可以再次触发
    setTimeout(() => {
        this.setData({ heartBeat: false });
    }, 500); // 动画时长为 500ms

    // (可选) 在这里可以加入一些逻辑，比如向服务器发送一个“感谢鼓励”的事件
    console.log('用户感谢了搭子的鼓励！');
  },

  // 同样，在 js 文件中增加这个空函数，以支持 wxml 中的 catchtouchmove
  preventTouchMove: function() {
    // do nothing
  },



  copyUrl() {
    wx.setClipboardData({
      data: "https://gitee.com/TencentCloudBase/cloudbase-agent-ui/tree/main/apps/miniprogram-agent-ui/miniprogram/components/agent-ui",
      success: function (res) {
        wx.showToast({
          title: "复制成功",
          icon: "success",
        });
      },
    });
  },

  copyPluginName() {
    wx.setClipboardData({
      data: "微信云开发 AI ToolKit",
      success: function (res) {
        wx.showToast({
          title: "复制成功",
          icon: "success",
        });
      },
    });
  },

  copyPrompt(e) {
    const prompt = e.currentTarget.dataset.prompt;
    wx.setClipboardData({
      data: prompt,
      success: function (res) {
        wx.showToast({
          title: "复制成功",
          icon: "success",
        });
      },
    });
  },

  insertRecord() {
    this.setData({
      showInsertModal: true,
      insertRegion: "",
      insertCity: "",
      insertSales: "",
    });
  },

  deleteRecord(e) {
    // 调用云函数删除记录
    wx.showLoading({
      title: "删除中...",
    });
    wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: {
          type: "deleteRecord",
          data: {
            _id: e.currentTarget.dataset.id,
          },
        },
      })
      .then((resp) => {
        wx.showToast({
          title: "删除成功",
        });
        this.getRecord(); // 刷新列表
        wx.hideLoading();
      })
      .catch((e) => {
        wx.showToast({
          title: "删除失败",
          icon: "none",
        });
        wx.hideLoading();
      });
  },

  // 输入框事件
  onInsertRegionInput(e) {
    this.setData({ insertRegion: e.detail.value });
  },
  onInsertCityInput(e) {
    this.setData({ insertCity: e.detail.value });
  },
  onInsertSalesInput(e) {
    this.setData({ insertSales: e.detail.value });
  },
  // 取消弹窗
  onInsertCancel() {
    this.setData({ showInsertModal: false });
  },

  // 确认插入
  async onInsertConfirm() {
    const { insertRegion, insertCity, insertSales } = this.data;
    if (!insertRegion || !insertCity || !insertSales) {
      wx.showToast({ title: "请填写完整信息", icon: "none" });
      return;
    }
    wx.showLoading({ title: "插入中..." });
    try {
      await wx.cloud.callFunction({
        name: "quickstartFunctions",
        data: {
          type: "insertRecord",
          data: {
            region: insertRegion,
            city: insertCity,
            sales: Number(insertSales),
          },
        },
      });
      wx.showToast({ title: "插入成功" });
      this.setData({ showInsertModal: false });
      this.getRecord(); // 刷新列表
    } catch (e) {
      wx.showToast({ title: "插入失败", icon: "none" });
      console.error(e);
    } finally {
      wx.hideLoading();
    }
  },

  getOpenId() {
    wx.showLoading({
      title: "",
    });
    wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: {
          type: "getOpenId",
        },
      })
      .then((resp) => {
        this.setData({
          haveGetOpenId: true,
          openId: resp.result.openid,
        });
        wx.hideLoading();
      })
      .catch((e) => {
        wx.hideLoading();
        const { errCode, errMsg } = e;
        if (errMsg.includes("Environment not found")) {
          this.setData({
            showTip: true,
            title: "云开发环境未找到",
            content:
              "如果已经开通云开发，请检查环境ID与 `miniprogram/app.js` 中的 `env` 参数是否一致。",
          });
          return;
        }
        if (errMsg.includes("FunctionName parameter could not be found")) {
          this.setData({
            showTip: true,
            title: "请上传云函数",
            content:
              "在'cloudfunctions/quickstartFunctions'目录右键，选择【上传并部署-云端安装依赖】，等待云函数上传完成后重试。",
          });
          return;
        }
      });
  },

  clearOpenId() {
    this.setData({
      haveGetOpenId: false,
      openId: "",
    });
  },

  clearCallContainerRes() {
    this.setData({
      haveGetCallContainerRes: false,
      callContainerResStr: "",
    });
  },

  getCodeSrc() {
    wx.showLoading({
      title: "",
    });
    wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: {
          type: "getMiniProgramCode",
        },
      })
      .then((resp) => {
        this.setData({
          haveGetCodeSrc: true,
          codeSrc: resp.result,
        });
        wx.hideLoading();
      })
      .catch((e) => {
        wx.hideLoading();
        console.error(e);
        const { errCode, errMsg } = e;
        if (errMsg.includes("Environment not found")) {
          this.setData({
            showTip: true,
            title: "云开发环境未找到",
            content:
              "如果已经开通云开发，请检查环境ID与 `miniprogram/app.js` 中的 `env` 参数是否一致。",
          });
          return;
        }
        if (errMsg.includes("FunctionName parameter could not be found")) {
          this.setData({
            showTip: true,
            title: "请上传云函数",
            content:
              "在'cloudfunctions/quickstartFunctions'目录右键，选择【上传并部署-云端安装依赖】，等待云函数上传完成后重试。",
          });
          return;
        }
      });
  },

  clearCodeSrc() {
    this.setData({
      haveGetCodeSrc: false,
      codeSrc: "",
    });
  },

  bindInput(e) {
    const index = e.currentTarget.dataset.index;
    const record = this.data.record;
    record[index].sales = Number(e.detail.value);
    this.setData({
      record,
    });
  },

  getRecord() {
    wx.showLoading({
      title: "",
    });
    wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: {
          type: "selectRecord",
        },
      })
      .then((resp) => {
        this.setData({
          haveGetRecord: true,
          record: resp.result.data,
        });
        wx.hideLoading();
      })
      .catch((e) => {
        this.setData({
          showTip: true,
        });
        wx.hideLoading();
        console.error(e);
      });
  },

  clearRecord() {
    this.setData({
      haveGetRecord: false,
      record: [],
    });
  },
  updateRecord() {
    wx.showLoading({
      title: "",
    });
    wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: {
          type: "updateRecord",
          data: this.data.record,
        },
      })
      .then((resp) => {
        wx.showToast({
          title: "更新成功",
        });
        wx.hideLoading();
      })
      .catch((e) => {
        console.log(e);
        this.setData({
          showUploadTip: true,
        });
        wx.hideLoading();
      });
  },

  uploadImg() {
    wx.showLoading({
      title: "",
    });
    // 让用户选择一张图片
    wx.chooseMedia({
      count: 1,
      success: (chooseResult) => {
        // 将图片上传至云存储空间
        wx.cloud
          .uploadFile({
            // 指定上传到的云路径
            cloudPath: `my-photo-${new Date().getTime()}.png`,
            // 指定要上传的文件的小程序临时文件路径
            filePath: chooseResult.tempFiles[0].tempFilePath,
          })
          .then((res) => {
            this.setData({
              haveGetImgSrc: true,
              imgSrc: res.fileID,
            });
          })
          .catch((e) => {
            console.log("e", e);
          });
      },
      complete: () => {
        wx.hideLoading();
      },
    });
  },

  clearImgSrc() {
    this.setData({
      haveGetImgSrc: false,
      imgSrc: "",
    });
  },

  goOfficialWebsite() {
    const url = "https://docs.cloudbase.net/toolbox/quick-start";
    wx.navigateTo({
      url: `../web/index?url=${url}`,
    });
  },
  runCallContainer: async function () {
    const app = getApp();
    console.log("globalData", app.globalData);
    const c1 = new wx.cloud.Cloud({
      resourceEnv: app.globalData.env,
    });
    await c1.init();
    const r = await c1.callContainer({
      path: "/api/users", // 填入业务自定义路径
      header: {
        "X-WX-SERVICE": "express-test", // 填入服务名称
      },
      // 其余参数同 wx.request
      method: "GET",
    });
    console.log(r);
    this.setData({
      haveGetCallContainerRes: true,
      callContainerResStr: `${JSON.stringify(r.data.items, null, 2)}`,
    });
  },
  getCallcbrCode: function () {
    const app = getApp();
    this.setData({
      callcbrCode: `const c1 = new wx.cloud.Cloud({
  resourceEnv: ${app.globalData.env}
})
await c1.init()
const r = await c1.callContainer({
  path: '/api/users', // 此处填入业务自定义路径， /api/users 为示例路径
  header: {
    'X-WX-SERVICE': 'express-test', // 填入业务服务名称，express-test 为示例服务
  },
  // 其余参数同 wx.request
  method: 'GET',
})`,
    });
  },
  getInitEnvCode: function () {
    const app = getApp();
    this.setData({
      initEnvCode: `wx.cloud.init({
  env: ${app.globalData.env},
  traceUser: true,
});`,
    });
  },
  getCreateCollectionCode: function () {
    this.setData({
      callCreateCollectionCode: `const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
const db = cloud.database();
// 创建集合云函数入口函数
exports.main = async (event, context) => {
  try {
    // 创建集合
    await db.createCollection('sales');
    return {
      success: true
    };
  } catch (e) {
    return {
      success: true,
      data: 'create collection success'
    };
  }
};`,
    });
  },
  getOpenIdCode: function () {
    this.setData({
      callOpenIdCode: `const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
// 获取openId云函数入口函数
exports.main = async (event, context) => {
  // 获取基础信息
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};`,
      callFunctionCode: `wx.cloud.callFunction({
  name: 'quickstartFunctions',
  data: {
    type: 'getOpenId'
  }
}).then((resp) => console.log(resp))`,
    });
  },
  getMiniProgramCode: function () {
    this.setData({
      callMiniProgramCode: `const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
// 获取小程序二维码云函数入口函数
exports.main = async (event, context) => {
  // 获取小程序二维码的buffer
  const resp = await cloud.openapi.wxacode.get({
    path: 'pages/index/index'
  });
  const { buffer } = resp;
  // 将图片上传云存储空间
  const upload = await cloud.uploadFile({
    cloudPath: 'code.png',
    fileContent: buffer
  });
  return upload.fileID;
};
`,
      callFunctionCode: `wx.cloud.callFunction({
  name: 'quickstartFunctions',
  data: {
    type: 'getMiniProgramCode'
  }
}).then((resp) => console.log(resp))`,
    });
  },
  getUploadFileCode: function () {
    this.setData({
      callUploadFileCode: `wx.chooseMedia({
count: 1,
success: (chooseResult) => {
  // 将图片上传至云存储空间
  wx.cloud
    .uploadFile({
      // 指定上传到的云路径
      cloudPath: "my-photo.png",
      // 指定要上传的文件的小程序临时文件路径
      filePath: chooseResult.tempFiles[0].tempFilePath,
    })
    .then((res) => {
      console.log(res)
    })
    .catch((e) => {
      console.log('e', e)
    });
}
});`,
    });
  },
});
