const app = getApp();

// 获取全局唯一的录音管理器
const recorderManager = wx.getRecorderManager();

Page({
  data: {
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
    this.initRecorder();
  },

  // 页面卸载时（退出小程序或关闭当前页），数据会自动销毁，无需额外手动删除
  onUnload() {
    // 如果你在其他地方用了Storage，这里可以 wx.removeStorageSync('chat_history');
    // 但基于你的要求，只存在 data 里是最好的，退出即焚。
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
      msgList: list,
      toView: 'scroll-bottom' // 滚动到底部
    });
  },

  // --- 请求 AI 接口 (核心) ---
  requestAI(question) {
    this.setData({ isAiThinking: true, toView: 'scroll-bottom' });

    // TODO: 这里替换为你真实的云函数或API调用
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
    setTimeout(() => {
      // 模拟返回结果
      const mockReply = `你问的是：“${question}” 吗？\n这是一个模拟的回答。你可以将这里替换为接入 DeepSeek、ChatGPT 或腾讯混元大模型的代码。通常建议在云函数中调用大模型API，保护Key不泄露。`;
      
      this.addMessage('ai', mockReply);
      this.setData({ isAiThinking: false });
    }, 1500);
    // --- 模拟结束 ---
  },

  // --- 语音功能初始化 ---
  initRecorder() {
    // 监听录音开始
    recorderManager.onStart(() => {
      console.log('recorder start');
      this.setData({ isRecording: true });
      wx.showToast({ title: '正在聆听...', icon: 'none' });
    });

    // 监听录音结束（拿到录音文件）
    recorderManager.onStop((res) => {
      console.log('recorder stop', res);
      this.setData({ isRecording: false });
      const { tempFilePath } = res;
      
      // 处理录音文件：转文字
      this.processVoice(tempFilePath);
    });

    // 监听录音错误
    recorderManager.onError((res) => {
      console.error(res);
      this.setData({ isRecording: false });
      wx.showToast({ title: '录音失败，请重试', icon: 'none' });
    });
  },

  // --- 按住说话 ---
  startRecord() {
    recorderManager.start({
      duration: 60000, // 最长60秒
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3', // 推荐使用 mp3 或 pcm
    });
  },

  // --- 松开结束 ---
  stopRecord() {
    recorderManager.stop();
  },

  // --- 语音转文字逻辑 ---
  processVoice(filePath) {
    wx.showLoading({ title: '正在识别...' });

    // TODO: 这里需要调用“微信同声传译”插件或上传到云函数调用语音识别API
    // 由于插件需要在 app.json 声明，这里写一个模拟的转换结果
    
    // --- 模拟语音转文字 ---
    setTimeout(() => {
      wx.hideLoading();
      const mockText = "我刚刚说了一句话"; // 模拟识别结果
      
      // 自动发送识别出的文字
      this.addMessage('user', mockText);
      this.requestAI(mockText);
    }, 1000);
    // --- 模拟结束 ---
    
    /* 真实场景建议：
       1. 上传 filePath 到云存储
       2. 调用云函数，云函数调用腾讯云语音识别接口(ASR)
       3. 返回文字
    */
  }
});