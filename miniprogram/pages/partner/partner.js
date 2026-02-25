// pages/partner/partner.js
const Typewriter = require('../../utils/typewriter');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 确保这个图片路径与你项目中的实际路径一致
    partnerAvatar: '/images/icons/doubao.png', 
    inputValue: '',
    scrollToView: '', // 用于控制 scroll-view 滚动到的位置 ID
    isAiTyping: false, // 控制是否显示 AI 正在输入的动画气泡
    msgList: [
      // 初始欢迎语，role 必须是 'ai' 以匹配 WXML 中的 wx:else 分支
      {
        id: 'init-0',
        role: 'ai', 
        content: '嗨！我是你的学习搭子。今天想聊点什么？无论是学习困惑还是闲聊，我都在哦！👋'
      }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadHistory();
  },

  /**
   * 加载本地历史聊天记录
   */
  loadHistory() {
    const history = wx.getStorageSync('partnerChatHistory');
    if (history && history.length > 0) {
      this.setData({ msgList: history });
      // 延迟滚动，确保页面渲染完成后再滚到底部
      setTimeout(() => {
        this.scrollToBottom();
      }, 200);
    }
  },

  /**
   * 保存最近 50 条历史记录到本地缓存
   */
  saveHistory() {
    const history = this.data.msgList.slice(-50);
    wx.setStorageSync('partnerChatHistory', history);
  },

  /**
   * 监听输入框内容变化
   */
  onInput(e) {
    this.setData({ inputValue: e.detail.value });
  },

  /**
   * 点击快捷指令 Chip
   */
  sendQuickMsg(e) {
    const text = e.currentTarget.dataset.text;
    this.sendUserMessage(text);
  },

  /**
   * 点击发送按钮或键盘回车
   */
  handleSend() {
    const text = this.data.inputValue.trim();
    if (!text) return;
    this.sendUserMessage(text);
  },

  /**
   * [核心逻辑] 发送用户消息
   * 1. 更新 UI 显示用户消息
   * 2. 触发 AI 思考状态
   * 3. 调用 API
   */
  sendUserMessage(text) {
    // 1. 构建用户消息对象，role 为 'user'
    const newMsg = {
      id: `msg-${Date.now()}`,
      role: 'user', 
      content: text
    };
    
    const list = this.data.msgList;
    list.push(newMsg);

    // 2. 更新数据，清空输入框，开启 AI 正在输入状态
    this.setData({
      msgList: list,
      inputValue: '', 
      isAiTyping: true 
    });

    // 3. 滚动到底部并保存
    this.scrollToBottom();
    this.saveHistory();

    // 4. 发起 AI 请求
    this.callAiApi(text);
  },

  // 调用 AI API (接入 DeepSeek)
  callAiApi(query) {
    this.setData({ isAiThinking: true });

    // 1. 获取今日计划数据 (从本地缓存)
    const planList = wx.getStorageSync('planList') || [];
    const todayPlanStr = planList.length > 0 
      ? planList.map(p => `- ${p.title} (状态: ${p.completed ? '已完成' : '未完成'})`).join('\n')
      : "暂无今日计划";

    // 2. 构建 System Prompt
    const systemPrompt = `你是一个贴心的学习搭子。你的任务是陪伴用户学习，鼓励他们，并根据他们的学习计划提供建议。
    
    【用户的今日计划】：
    ${todayPlanStr}
    
    请根据用户的输入和计划情况进行回复。语气要活泼、可爱、充满正能量。如果用户问计划，请根据上述数据回答。`;

    // 3. 调用云函数
    wx.cloud.callFunction({
      name: 'studyPlanAI',
      data: {
        type: 'chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ]
      },
      success: (res) => {
        const result = res.result;
        if (result && result.success && result.data && result.data.choices) {
          const replyText = result.data.choices[0].message.content;
          this.handleAiResponse(replyText);
        } else {
          console.error('AI API Error:', result);
          this.handleAiResponse("哎呀，我脑子卡了一下（云函数调用失败），请稍后再试～");
        }
      },
      fail: (err) => {
        console.error('Cloud Call Failed:', err);
        this.handleAiResponse("网络好像有点问题，我听不清你说什么...");
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
    // 1. 先创建一个空的 AI 消息占位
    const aiMsgId = `msg-${Date.now()}`;
    const aiMsg = {
      id: aiMsgId,
      role: 'ai',
      content: '' // 初始为空
    };

    const list = this.data.msgList;
    list.push(aiMsg);

    // 2. 更新列表，保持 isAiTyping 为 true (因为还在打字)
    this.setData({
      msgList: list,
      isAiTyping: true // 这里保持 true，让输入状态的气泡继续显示或者直接用打字内容替代
    });
    this.scrollToBottom();

    // 3. 启动打字机
    const typewriter = new Typewriter({
      speed: 50,
      onUpdate: (currentText) => {
        // 更新最后一条消息的内容
        const lastIndex = this.data.msgList.length - 1;
        const key = `msgList[${lastIndex}].content`;
        
        this.setData({
          [key]: currentText
        });
        
        // 每打几个字滚一下，体验更好
        if (currentText.length % 10 === 0) {
          this.scrollToBottom();
        }
      },
      onComplete: () => {
        this.setData({ isAiTyping: false });
        this.saveHistory();
        this.scrollToBottom();
        // 收到完整回复时的轻微震动反馈
        wx.vibrateShort({ type: 'light' });
      }
    });

    typewriter.start(text);
  },

  /**
   * 滚动到底部逻辑
   * 对应 WXML 中的 scroll-into-view="{{scrollToView}}"
   * WXML 中的 id 是 msg-{{index}}
   */
  scrollToBottom() {
    wx.nextTick(() => {
      this.setData({
        // 这里的 index 对应数组最后一个元素的下标
        scrollToView: `msg-${this.data.msgList.length - 1}`
      });
    });
  },

  /**
   * 点击聊天背景收起键盘
   */
  hideKeyboard() {
    wx.hideKeyboard();
  }
});