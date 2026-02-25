// pages/homepage/homepage.js
const app = getApp();

Page({
  data: {
    // --- 搭子问候相关 ---
    aiGreetingText: '正在加载问候语...',
    partnerAvatar: '/images/icons/doubao.png',

    // --- 学习概览相关 ---
    todayLearnedDuration: '0h 0m',
    planCompletionRate: 0,

    // --- 计划列表相关 ---
    planList: [], 

    // --- 控制添加任务弹窗 ---
    showAddPlanModal: false,
    newPlanSubject: '',
    newPlanDuration: '',

    // --- 用于手动滑动删除 ---
    touchStartX: 0, 
    touchStartY: 0, 
    deleteThreshold: -160, 
  },

  onLoad(options) {
    this.loadPlanList();
    this.getAIGreeting();
    this.updateTodaySummary();
  },

  onShow() {
    this.loadPlanList();
    this.updateTodaySummary();
    // 刷新概览，确保从 focus 页返回后数据是最新的
  },

  /**
   * 从本地缓存加载计划列表
   */
  loadPlanList() {
    let planList = wx.getStorageSync('planList') || [];
    // 初始化滑动状态
    planList.forEach(item => {
      if (typeof item.x === 'undefined') item.x = 0;
      item.isDeleting = false;
    }); 
    this.setData({ planList });
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
   * 更新今日学习概览
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
   * [核心修改] 点击开始按钮，跳转到专注页面
   * 重点：确保 subject 被正确获取并编码放入 URL
   */
  startFocus(e) {
    // 1. 获取任务数据
    // 兼容逻辑：优先取 event.detail.item (如果组件emit传了), 否则取 dataset
    const item = (e.detail && e.detail.item) || e.currentTarget.dataset.item;
    
    console.log('准备开始任务:', item); // 【调试点】请在控制台看这里打印出的 subject 是否正确

    if (!item) { 
      wx.showToast({ title: '数据获取失败', icon: 'none' });
      return; 
    }
    
    if (item.status === 'done') {
      wx.showToast({ title: '这个任务已经完成啦', icon: 'none' });
      return;
    }
    
    // 2. 拼接 URL，使用 encodeURIComponent 处理中文
    const url = `/pages/focus/focus?id=${item.id}&subject=${encodeURIComponent(item.subject)}&duration=${item.duration}`;

    console.log('跳转URL:', url); // 【调试点】检查 URL 中 subject 是否正确

    // 3. 跳转
    wx.navigateTo({
      url: url,
      events: {
        // 监听 focus 页面传回的数据
        acceptStudyRecord: (data) => {
          console.log('[homepage] 接收到专注页回传的数据:', data);
          this.handleStudyRecord(data);
        }
      },
      fail: (err) => {
        console.error('跳转失败', err);
        wx.showToast({ title: '跳转失败', icon: 'none' });
      }
    });
  },

  /**
   * 处理从 focus 页面返回的学习记录
   */
  handleStudyRecord(record) {
    if (!record || typeof record.duration !== 'number' || typeof record.id === 'undefined') {
      return;
    }

    // 1. 更新时长记录 (防重)
    const todayRecords = wx.getStorageSync('todayRecords') || [];
    // 简单防重: ID相同且时间戳接近
    const isDuplicate = todayRecords.some(r => r.id === record.id && Math.abs((r.time || 0) - record.time) < 2000);
    
    if (!isDuplicate) {
        todayRecords.push(record);
        wx.setStorageSync('todayRecords', todayRecords);
    }

    // 2. 更新任务状态为已完成
    const planList = this.data.planList;
    const planIndex = planList.findIndex(p => p.id === record.id);
    
    if (planIndex !== -1) {
        if (planList[planIndex].status !== 'done') {
            planList[planIndex].status = 'done';
            this.setData({ planList }); 
            wx.setStorageSync('planList', planList); 
            this.updateTodaySummary(); 
        }
    }
  },
  
  onGreetingCardTap() {
    wx.showToast({ title: '搭子给你打气啦！加油！', icon: 'none' });
  },

  // --- 弹窗逻辑 ---
  openAddPlanModal() {
    this.setData({ showAddPlanModal: true, newPlanSubject: '', newPlanDuration: '' });
  },
  closeAddPlanModal() {
    this.setData({ showAddPlanModal: false });
  },
  preventModalClose() {},
  onSubjectInput(e) { this.setData({ newPlanSubject: e.detail.value }); },
  onDurationInput(e) { this.setData({ newPlanDuration: e.detail.value }); },
  
  /**
   * 新增任务
   * 确保 newPlanSubject 被正确写入
   */
  handleAddNewPlan() {
    const { newPlanSubject, newPlanDuration, planList } = this.data;
    if (!newPlanSubject.trim() || !parseInt(newPlanDuration) > 0) {
      wx.showToast({ title: '请填写有效信息', icon: 'none' });
      return;
    }

    const newPlan = { 
      id: Date.now(), 
      subject: newPlanSubject, // 这里保存了自定义名称
      duration: parseInt(newPlanDuration), 
      status: 'pending', 
      x: 0, 
      isDeleting: false 
    };

    const updatedPlanList = [newPlan, ...planList];
    this.setData({ planList: updatedPlanList });
    wx.setStorageSync('planList', updatedPlanList);
    
    this.closeAddPlanModal();
    wx.showToast({ title: '添加成功！', icon: 'success' });
    this.updateTodaySummary();
  },

  // --- 滑动删除逻辑 ---
  onTouchStart(e) {
    if (e.touches.length > 1) return; 
    const index = e.currentTarget.dataset.index;
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
    if (e.touches.length > 1) return;
    const index = e.currentTarget.dataset.index;
    const moveX = e.touches[0].clientX;
    const moveY = e.touches[0].clientY;
    const deltaX = moveX - this.data.touchStartX;
    const deltaY = moveY - this.data.touchStartY;

    if (Math.abs(deltaY) > Math.abs(deltaX)) return; 
    
    if (deltaX < 0) { 
      const newX = Math.max(deltaX, this.data.deleteThreshold);
      this.data.planList[index].x = newX;
      this.setData({ planList: this.data.planList });
    }
  },

  onTouchEnd(e) {
    const index = e.currentTarget.dataset.index;
    const currentX = this.data.planList[index].x;
    const threshold = this.data.deleteThreshold / 2;
    this.data.planList[index].x = currentX < threshold ? this.data.deleteThreshold : 0;
    this.setData({ planList: this.data.planList });
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
            this.data.planList[index].isDeleting = true;
            this.setData({ planList: this.data.planList });

            setTimeout(() => {
              const updatedPlanList = this.data.planList.filter(item => item.id !== idToDelete);
              this.setData({ planList: updatedPlanList });
              wx.setStorageSync('planList', updatedPlanList);
              this.updateTodaySummary();
              wx.showToast({ title: '删除成功', icon: 'none' });
            }, 300);
          }
        } else {
          const index = this.data.planList.findIndex(item => item.id === idToDelete);
          if (index > -1) {
            this.data.planList[index].x = 0;
            this.setData({ planList: this.data.planList });
          }
        }
      }
    });
  }
});