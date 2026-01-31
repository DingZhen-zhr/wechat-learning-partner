// pages/homepage/homepage.js
const app = getApp();

Page({
  data: {
    // --- 搭子问候相关 ---
    aiGreetingText: '正在加载问候语...',
    partnerAvatar: '/images/icons/doubao.png', // 建议使用本地图片，更稳定

    // --- 学习概览相关 ---
    todayLearnedDuration: '0h 0m',
    planCompletionRate: 0,

    // --- 计划列表相关 ---
    planList: [], // 页面加载时会从缓存读取

    // --- 控制添加任务弹窗 ---
    showAddPlanModal: false,
    newPlanSubject: '',
    newPlanDuration: '',

    // --- 用于手动滑动删除 ---
    touchStartX: 0, // 记录触摸起始位置的X坐标
    touchStartY: 0, // 记录触摸起始位置的Y坐标
    deleteThreshold: -160, // 滑动阈值, 与 wxss 中 .delete-action 的宽度一致
  },

  /**
   * 页面加载时，只在第一次进入时执行
   */
  onLoad(options) {
    this.loadPlanList();
    this.getAIGreeting();
    this.updateTodaySummary();
  },

  /**
   * 页面显示时，每次切到该页或从其他页返回时都会执行
   */
  onShow() {
    this.loadPlanList();
    this.updateTodaySummary();

    // 检查并处理从 focus 页面通过全局变量回传的学习记录
    if (app && app.globalData && app.globalData.lastStudyRecord) {
      this.handleStudyRecord(app.globalData.lastStudyRecord);
      // 处理完后立即清空，这是非常重要的一步，防止重复处理
      app.globalData.lastStudyRecord = null; 
    }
  },

  /**
   * 从本地缓存加载计划列表
   */
  loadPlanList() {
    let planList = wx.getStorageSync('planList') || [];
    // 为每个任务项初始化滑动所需的 x 坐标和 isDeleting 状态
    planList.forEach(item => {
      item.x = 0;
      item.isDeleting = false;
    }); 
    this.setData({
      planList: planList
    });
  },

  /**
   * 获取 AI 问候语
   */
  getAIGreeting() {
    this.setData({ aiGreetingText: '搭子正在思考中...' });
    setTimeout(() => {
      const hour = new Date().getHours();
      let timeOfDayGreeting;
      if (hour < 6) timeOfDayGreeting = "凌晨好，熬夜辛苦了！";
      else if (hour < 12) timeOfDayGreeting = "早上好！新的一天，元气满满！";
      else if (hour < 18) timeOfDayGreeting = "下午好！";
      else timeOfDayGreeting = "晚上好！";
      
      const nextPlan = this.data.planList.find(p => p.status === 'pending');
      let planGreeting = "今天还没有计划哦，快来制定一个吧！";
      if (nextPlan) {
        planGreeting = `今天的第一个任务是“${nextPlan.subject}”，一起加油吧！`;
      }
      this.setData({ aiGreetingText: `${timeOfDayGreeting} ${planGreeting}` });
    }, 1500);
  },

  /**
   * 更新今日学习概览 (按任务数量计算)
   */
  updateTodaySummary() {
    const todayRecords = wx.getStorageSync('todayRecords') || [];
    let totalSeconds = todayRecords.reduce((sum, record) => sum + (record.duration || 0), 0);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    this.setData({ todayLearnedDuration: `${hours}h ${minutes}m` });
    
    const { planList } = this.data;
    if (!planList || planList.length === 0) {
      this.setData({ planCompletionRate: 0 });
      return;
    }

    const totalPlans = planList.length;
    const donePlans = planList.filter(p => p.status === 'done').length;
    let rate = (totalPlans > 0) ? Math.round((donePlans / totalPlans) * 100) : 0;
    this.setData({ planCompletionRate: rate });
  },

  /**
   * 点击开始按钮，跳转到专注页面
   */
  startFocus(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) { return; }
    if (item.status === 'done') {
      wx.showToast({ title: '这个任务已经完成啦', icon: 'none' });
      return;
    }
    
    // 使用全局变量为 tabBar 页面传参
    if (app && app.globalData) {
      app.globalData.pendingFocusParams = {
        id: item.id,
        subject: item.subject,
        duration: item.duration
      };
    }
    wx.switchTab({ url: '/pages/focus/focus' });
  },

  /**
   * 处理从 focus 页面返回的学习记录
   */
  handleStudyRecord(record) {
    if (!record || typeof record.duration !== 'number' || typeof record.id === 'undefined') {
      return;
    }

    const todayRecords = wx.getStorageSync('todayRecords') || [];
    if (!todayRecords.some(r => r.id === record.id)) {
        todayRecords.push(record);
        wx.setStorageSync('todayRecords', todayRecords);
    }

    const planList = this.data.planList;
    const planIndex = planList.findIndex(p => p.id === record.id);
    if (planIndex !== -1 && planList[planIndex].status !== 'done') {
        planList[planIndex].status = 'done';
        this.setData({ planList });
        wx.setStorageSync('planList', planList);
        this.updateTodaySummary(); 
    }
  },
  
  onGreetingCardTap() {
    wx.showToast({ title: '搭子给你打气啦！加油！', icon: 'none' });
  },

  /**
   * 打开添加任务的弹窗
   */
  openAddPlanModal() {
    this.setData({ showAddPlanModal: true, newPlanSubject: '', newPlanDuration: '' });
  },

  /**
   * 关闭添加任务的弹窗
   */
  closeAddPlanModal() {
    this.setData({ showAddPlanModal: false });
  },

  preventModalClose() {},
  onSubjectInput(e) { this.setData({ newPlanSubject: e.detail.value }); },
  onDurationInput(e) { this.setData({ newPlanDuration: e.detail.value }); },
  
  /**
   * 处理“确认添加”按钮的点击事件
   */
  handleAddNewPlan() {
    const { newPlanSubject, newPlanDuration, planList } = this.data;
    if (!newPlanSubject.trim() || !parseInt(newPlanDuration) > 0) {
      wx.showToast({ title: '请填写有效信息', icon: 'none' });
      return;
    }
    const newPlan = { 
      id: Date.now(), 
      subject: newPlanSubject, 
      duration: parseInt(newPlanDuration), 
      status: 'pending', 
      x: 0, // 用于滑动删除的x坐标
      isDeleting: false // 用于删除动画
    };
    const updatedPlanList = [newPlan, ...planList];
    this.setData({ planList: updatedPlanList });
    wx.setStorageSync('planList', updatedPlanList);
    this.closeAddPlanModal();
    wx.showToast({ title: '添加成功！', icon: 'success' });
    this.updateTodaySummary();
  },

  /**
   * 手动滑动删除系列函数
   */
  onTouchStart(e) {
    const index = e.currentTarget.dataset.index;
    // 关闭其他所有已打开的滑块
    this.data.planList.forEach((item, i) => {
      if (i !== index) item.x = 0;
    });
    this.setData({
      planList: this.data.planList,
      touchStartX: e.touches[0].clientX,
      touchStartY: e.touches[0].clientY
    });
  },

  onTouchMove(e) {
    const index = e.currentTarget.dataset.index;
    const moveX = e.touches[0].clientX;
    const moveY = e.touches[0].clientY;
    const deltaX = moveX - this.data.touchStartX;
    const deltaY = moveY - this.data.touchStartY;

    // 如果垂直滑动距离大于水平滑动距离，则判断为页面滚动，不进行水平滑动
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }
    
    // 只允许左滑
    if (deltaX < 0) {
      const newX = Math.max(deltaX, this.data.deleteThreshold);
      this.data.planList[index].x = newX;
      this.setData({
        planList: this.data.planList
      });
    }
  },

  onTouchEnd(e) {
    const index = e.currentTarget.dataset.index;
    const currentX = this.data.planList[index].x;
    const threshold = this.data.deleteThreshold / 2;

    this.data.planList[index].x = currentX < threshold ? this.data.deleteThreshold : 0;
    this.setData({
      planList: this.data.planList
    });
  },

  handleDeletePlan(e) {
    const idToDelete = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个计划吗？',
      confirmColor: '#e53935',
      success: (res) => {
        if (res.confirm) {
          const index = this.data.planList.findIndex(item => item.id === idToDelete);
          if (index > -1) {
            // 触发删除动画
            this.data.planList[index].isDeleting = true;
            this.setData({ planList: this.data.planList });

            // 动画结束后再真正从数据中删除
            setTimeout(() => {
              const updatedPlanList = this.data.planList.filter(item => item.id !== idToDelete);
              this.setData({ planList: updatedPlanList });
              wx.setStorageSync('planList', updatedPlanList);
              this.updateTodaySummary();
              wx.showToast({ title: '删除成功', icon: 'none' });
            }, 300); // 动画时长应与 wxss 中 transition 时间一致
          }
        } else {
          // 用户取消，将滑块归位
          const index = this.data.planList.findIndex(item => item.id === idToDelete);
          if (index > -1) {
            this.data.planList[index].x = 0;
            this.setData({
              planList: this.data.planList
            });
          }
        }
      }
    });
  }
});