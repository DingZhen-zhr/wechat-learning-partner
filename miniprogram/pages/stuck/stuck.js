// pages/stuck/stuck.js
const app = getApp();

// 引入微信同声传译插件
// 【重要】请确保在 app.json 的 "plugins" 中配置了 "WechatSI"
const plugin = requirePlugin("WechatSI");
// 获取全局唯一的语音识别管理器
const manager = plugin.getRecordRecognitionManager();

Page({
  data: {
    // 消息列表：type 必须是 'ai' 或 'user' 以匹配 WXML 中的 wx:if
    msgList: [
      {
        type: 'ai',
        content: '你好！我是你的学习助手。遇到什么困难了吗？无论是代码报错还是概念不理解，都可以问我哦！'
      }
    ],
    inputText: '',
    isVoiceMode: false, // 是否为语音模式
    isRecording: false, // 是否正在录音
    isAiThinking: false, // AI是否正在回复
    toView: '' // 控制滚动条位置
  },

  onLoad() {
    // 初始化录音监听
  // 页面卸载时（退出小程序或关闭当前页），数据会自动销毁，无需额外手动删除
    this.initRecorder();
    // 如果你在其他地方用了Storage，这里可以 wx.removeStorageSync('chat_history');
    // 但基于你的要求，只存在 data 里是最好的，退出即焚。
  },
  onUnload() {
    // 页面卸载逻辑
    manager.stop(); // 确保退出页面时停止录音
  },

  // --- 输入模式切换 ---
  toggleInputMode() {
    this.setData({
      isVoiceMode: !this.data.isVoiceMode
    });
  },

  // --- 文本输入处理 ---
  onInput(e) {
    this.setData({
      inputText: e.detail.value
    });
  },

  // --- 发送消息逻辑 ---
  sendText() {
    const content = this.data.inputText.trim();
    if (!content) return;

    // 1. 添加用户消息到列表
    this.addMessage('user', content);

    // 2. 清空输入框
    this.setData({ inputText: '' });

    // 3. 请求 AI
    this.requestAI(content);
  },

  // --- 添加消息到视图 ---
  addMessage(type, content) {
    const list = this.data.msgList;
    list.push({ type, content });

    this.setData({
      msgList: list
    });

    // 数据更新后，执行滚动
    this.scrollToBottom();
  },
    // 示例：使用 wx.cloud.callFunction 调用你的 AI 云函数
    /*
    wx.cloud.callFunction({
      name: 'askAI',
      data: { prompt: question },
      success: res => { ... },
      fail: err => { ... }
    })
    */

    // --- 以下是模拟 AI 回复的代码 ---

  // --- 滚动到底部 (优化版) ---
  scrollToBottom() {
    // 先清空，再设置，确保 scroll-into-view 属性发生变化从而触发滚动
    this.setData({ toView: '' });

    // nextTick 确保视图渲染完成后再跳转
    // --- 模拟结束 ---
    wx.nextTick(() => {
      this.setData({
        toView: 'scroll-bottom' // 对应 WXML 底部锚点的 id
      });
    });
  },

  // --- 请求 AI 接口 (接入 DeepSeek) ---
  requestAI(question) {
    this.setData({ isAiThinking: true, toView: 'scroll-bottom' });

    wx.cloud.callFunction({
      name: 'studyPlanAI',
      data: {
        type: 'chat',
        messages: [
          { role: 'system', content: "你是一个全能的学习助手。用户会向你请教代码错误、概念理解或学习困难。请给出清晰、专业且易于理解的解答。如果是代码问题，请提供修复建议。" },
          { role: 'user', content: question }
        ]
      },
      success: (res) => {
        const result = res.result;
        if (result && result.success && result.data && result.data.choices) {
          const reply = result.data.choices[0].message.content;
          this.handleAiResponse(reply);
        } else {
          console.error('AI Error:', result);
          this.addMessage('ai', "抱歉，我遇到了一点技术问题，暂时无法回答。");
        }
      },
      fail: (err) => {
        console.error('Cloud Call Failed:', err);
        this.addMessage('ai', "网络连接失败，请检查网络。");
      },
      complete: () => {
        this.setData({ isAiThinking: false });
      }
    });
  },

  /**
   * [核心逻辑] 处理 AI 回复 (流式打字机效果)
   */
  handleAiResponse(text) {
    const Typewriter = require('../../utils/typewriter');
    
    // 1. 先创建一个空的 AI 消息占位
    const aiMsgId = `msg-${Date.now()}`;
    const aiMsg = {
      id: aiMsgId,
      type: 'ai',
      content: '' // 初始为空
    };

    const list = this.data.msgList;
    list.push(aiMsg);

    this.setData({
      msgList: list,
      isAiThinking: true // 保持思考状态（或新增一个 isTyping 状态）
    });
    this.scrollToBottom();

    // 2. 启动打字机
    const typewriter = new Typewriter({
      speed: 50,
      onUpdate: (currentText) => {
        const lastIndex = this.data.msgList.length - 1;
        const key = `msgList[${lastIndex}].content`;
        
        this.setData({
          [key]: currentText
        });
        
        // 滚动跟随
        if (currentText.length % 15 === 0) {
          this.scrollToBottom();
        }
      },
      onComplete: () => {
        this.setData({ isAiThinking: false });
        this.scrollToBottom();
        // 震动反馈
        wx.vibrateShort({ type: 'light' });
      }
    });

    typewriter.start(text);
  },

  // --- 语音功能初始化 (使用同声传译插件) ---
  initRecorder() {
    // 监听录音开始
    manager.onStart = (res) => {
      console.log('recorder start', res);
      this.setData({ isRecording: true });
      wx.showToast({ title: '正在聆听...', icon: 'none', duration: 60000 });
    };

    // 监听录音结束（直接拿到识别结果）
    manager.onStop = (res) => {
      console.log('recorder stop', res);
      wx.hideToast(); // 隐藏“正在聆听”提示
      this.setData({ isRecording: false });

      const text = res.result;
      if (text && text.trim().length > 0) {
        // 识别成功，直接发送
        this.addMessage('user', text);
        this.requestAI(text);
      } else {
        // 增加对空结果的宽容度，或者提示更友好
        console.warn('Recorder returned empty text');
        // wx.showToast({ title: '未识别到内容，请重试', icon: 'none' });
      }
    };

    // 监听录音错误
    manager.onError = (res) => {
      console.error('recorder error', res);
      wx.hideToast();
      this.setData({ isRecording: false });

      // 常见错误处理
      let msg = '录音失败';
      if (res.msg.includes('auth deny')) msg = '请授权录音权限';
      // 忽略 -30003 等非致命错误
      if (res.retcode !== -30003) {
         wx.showToast({ title: msg, icon: 'none' });
      }
    };
  },

  // --- 按住说话 ---
  startRecord() {
    // 震动反馈，提升按压手感
    wx.vibrateShort({ type: 'medium' });
    manager.start({
      duration: 30000, // 最长30秒
      lang: "zh_CN"
    });
  },

  // --- 松开结束 ---
  stopRecord() {
    manager.stop();
  }
});