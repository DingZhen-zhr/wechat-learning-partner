// pages/focus/focus.js
const app = getApp();

Page({
  data: {
    // --- 核心业务数据 ---
    planId: null,
    subject: '未知科目', 
    initialTime: 25 * 60, 
    
    // --- 界面与交互数据 ---
    partnerAvatar: '/images/icons/doubao.png', // 确保此路径下有图片
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
   * 页面加载
   */
  onLoad(options) {
    console.log('[focus] 页面加载，参数:', options);

    // 1. 解析 URL 参数
    if (options.subject) {
      // 处理可能存在的编码问题
      const decodedSubject = decodeURIComponent(options.subject);
      
      this.setData({
        planId: parseInt(options.id || 0),
        subject: decodedSubject,
        // 如果没有传 duration，默认 25 分钟
        initialTime: parseInt(options.duration || 25) * 60
      });
    }

    // 2. 尝试自动开始计时 (延迟执行以等待组件挂载)
    this._maybeAutoStartTimer();

    // 3. 启动搭子气泡互动
    this.startBubbleTimer();

    // 4. 重置发送标志位
    this._sentStudyRecord = false;
  },

  /**
   * 页面卸载
   */
  onUnload() {
    // 清理定时器，防止内存泄漏
    if (this.data.bubbleTimer) {
      clearInterval(this.data.bubbleTimer);
    }
  },

  // ==========================================
  // === 计时器与互动逻辑 ===
  // ==========================================

  startBubbleTimer() {
    const bubbleInterval = 20000; // 每20秒尝试显示一次
    const timer = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * this.data.bubbleMessages.length);
      this.setData({
        bubbleText: this.data.bubbleMessages[randomIndex],
        showBubble: true
      });
      // 5秒后自动消失
      setTimeout(() => {
        this.setData({ showBubble: false });
      }, 5000);
    }, bubbleInterval);
    this.setData({ bubbleTimer: timer });
  },

  _maybeAutoStartTimer() {
    setTimeout(() => {
      const timerComp = this.selectComponent('.study-timer');
      if (timerComp && !timerComp.data.running) {
        timerComp.startTimer(); 
      }
    }, 200);
  },

  onTimeUpdate(e) {
    this.setData({ totalSecondsStudied: e.detail.totalSeconds });
  },

  // 计时自然结束
  onFinish() {
    this.showSummary();
  },

  // 用户手动提前结束
  handleManualFinish() {
    const timerComponent = this.selectComponent('.study-timer');
    if (timerComponent) {
      timerComponent.stopTimer();
    }
    this.showSummary();
  },

  // 显示总结弹窗
  showSummary() {
    if (this.data.bubbleTimer) clearInterval(this.data.bubbleTimer);
    
    const duration = this.formatDuration(this.data.totalSecondsStudied);
    this.setData({
      finalStudyDuration: duration,
      showSummaryModal: true
    });
  },

  // ==========================================
  // === 数据保存与回传逻辑 (核心) ===
  // ==========================================

  /**
   * 更新计划进度并保存数据
   */
  updatePlanProgress() {
    if (this._sentStudyRecord) return; // 防止重复执行

    const record = {
      id: this.data.planId,
      subject: this.data.subject,
      duration: this.data.totalSecondsStudied,
      time: Date.now() // 记录当前时间戳
    };

    // 1. 尝试通过 EventChannel 回传给 Homepage (用于即时更新列表状态)
    const eventChannel = this.getOpenerEventChannel();
    if (eventChannel && eventChannel.emit) {
      eventChannel.emit('acceptStudyRecord', record);
      console.log('[focus] EventChannel 数据发送成功');
    }

    // 2. 更新本地缓存 (用于数据持久化和图表统计)
    this._updateLocalCache(record);

    this._sentStudyRecord = true;
  },

  /**
   * 更新本地所有相关的缓存数据
   */
  _updateLocalCache(record) {
    try {
      // --- A. 更新今日简报数据 (Homepage 用) ---
      const todayRecords = wx.getStorageSync('todayRecords') || [];
      // 简单防重
      if (!todayRecords.some(r => r.id === record.id && r.time === record.time)) {
        todayRecords.push(record);
        wx.setStorageSync('todayRecords', todayRecords);
      }

      // --- B. 更新历史总记录 (Progress 图表页用) --- 【关键补充】
      const studyHistory = wx.getStorageSync('studyHistory') || [];
      const historyExists = studyHistory.some(r => r.id === record.id && r.time === record.time);
      if (!historyExists) {
        studyHistory.push(record);
        wx.setStorageSync('studyHistory', studyHistory);
        console.log('[focus] 已写入历史记录 studyHistory');
      }

      // --- C. 更新计划列表状态 (标记为已完成) ---
      const planList = wx.getStorageSync('planList') || [];
      const idx = planList.findIndex(p => p.id === record.id);
      if (idx !== -1) {
        planList[idx].status = 'done';
        wx.setStorageSync('planList', planList);
      }
      
    } catch (e) {
      console.error('[focus] 更新缓存失败', e);
    }
  },

  // ==========================================
  // === 界面辅助函数 ===
  // ==========================================

  closeSummaryModal() {
    this.setData({ showSummaryModal: false });
    
    // 触发保存逻辑
    this.updatePlanProgress();
    
    // 返回上一页
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
    } else {
      // 兜底：如果是单页打开，重定向回首页
      wx.reLaunch({ url: '/pages/homepage/homepage' });
    }
  },

  formatDuration(seconds) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  },

  handleBubbleFeedback() {
    this.setData({ heartBeat: true });
    // 增加轻微震动反馈，提升交互感
    wx.vibrateShort({ type: 'light' });
    
    setTimeout(() => { 
      this.setData({ heartBeat: false }); 
    }, 500);
  },

  preventTouchMove() {
    // 阻止弹窗下的页面滚动
  }
});