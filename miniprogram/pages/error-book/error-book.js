// pages/error-book/error-book.js
Page({

  data: {
    // 状态控制
    currentSubject: null, // 当前选中的科目，null表示在首页
    isEditing: false,     // 是否处于编辑模式
    isAnalyzing: false,   // 是否正在进行AI分析

    // 数据
    categories: ['数学', '英语', '政治', '专业课'], // 默认科目
    categoryCounts: {}, // 各科目题目数量统计 { '数学': 5, ... }
    allProblems: [], // 所有错题数据，结构：{ id, subject, date, questionImg, answerImg, notes, aiAnalysis, expanded }
    currentList: [], // 当前选中科目的题目列表

    // 编辑时的临时数据
    tempQuestionImg: '',
    tempAnswerImg: '',
    tempNotes: '',
    tempAiResult: ''
  },

  onLoad(options) {
    this.loadData();
  },

  onShow() {
    this.updateCategoryCounts();
  },

  // --- 数据加载与持久化 ---
  loadData() {
    const categories = wx.getStorageSync('errorBookCategories') || this.data.categories;
    const allProblems = wx.getStorageSync('errorBookProblems') || [];
    this.setData({ categories, allProblems });
    this.updateCategoryCounts();
  },

  saveData() {
    wx.setStorageSync('errorBookCategories', this.data.categories);
    wx.setStorageSync('errorBookProblems', this.data.allProblems);
    this.updateCategoryCounts();
  },

  updateCategoryCounts() {
    const counts = {};
    this.data.categories.forEach(cat => counts[cat] = 0);
    this.data.allProblems.forEach(p => {
      if (counts[p.subject] !== undefined) {
        counts[p.subject]++;
      }
    });
    this.setData({ categoryCounts: counts });
  },

  // --- 科目管理 ---
  handleAddCategory() {
    wx.showModal({
      title: '新建科目',
      editable: true,
      placeholderText: '请输入科目名称（如：物理）',
      success: (res) => {
        if (res.confirm && res.content) {
          const newCat = res.content.trim();
          if (newCat && !this.data.categories.includes(newCat)) {
            const newCategories = [...this.data.categories, newCat];
            this.setData({ categories: newCategories });
            this.saveData();
            wx.showToast({ title: '添加成功', icon: 'none' });
          } else if (this.data.categories.includes(newCat)) {
            wx.showToast({ title: '该科目已存在', icon: 'none' });
          }
        }
      }
    });
  },

  enterSubject(e) {
    const subject = e.currentTarget.dataset.subject;
    this.updateCurrentList(subject);
    this.setData({ currentSubject: subject });
  },

  backToCategories() {
    this.setData({ currentSubject: null });
  },

  updateCurrentList(subject) {
    const list = this.data.allProblems.filter(p => p.subject === subject);
    // 按时间倒序
    list.sort((a, b) => b.id - a.id);
    this.setData({ currentList: list });
  },

  // --- 题目卡片交互 ---
  toggleExpand(e) {
    const id = e.currentTarget.dataset.id;
    const list = this.data.currentList.map(item => {
      if (item.id === id) {
        return { ...item, expanded: !item.expanded };
      }
      return item;
    });
    this.setData({ currentList: list });
  },

  previewImage(e) {
    const src = e.currentTarget.dataset.src;
    wx.previewImage({ urls: [src] });
  },

  deleteProblem(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '提示',
      content: '确定要删除这道错题吗？',
      success: (res) => {
        if (res.confirm) {
          const newAll = this.data.allProblems.filter(p => p.id !== id);
          this.setData({ allProblems: newAll });
          this.saveData();
          this.updateCurrentList(this.data.currentSubject);
          wx.showToast({ title: '删除成功', icon: 'none' });
        }
      }
    });
  },

  // --- 编辑/添加逻辑 ---
  startAdding() {
    this.setData({
      isEditing: true,
      tempQuestionImg: '',
      tempAnswerImg: '',
      tempNotes: '',
      tempAiResult: ''
    });
  },

  cancelEdit() {
    this.setData({ isEditing: false });
  },

  chooseImage(e) {
    const type = e.currentTarget.dataset.type;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath;
        if (type === 'question') {
          this.setData({ tempQuestionImg: tempPath });
        } else {
          this.setData({ tempAnswerImg: tempPath });
        }
      }
    });
  },

  onNoteInput(e) {
    this.setData({ tempNotes: e.detail.value });
  },

  // [核心] 调用 AI 分析 API (接入 DeepSeek)
  callAIAnalysis() {
    // 如果没有备注也没有图片，提示用户
    if (!this.data.tempNotes && !this.data.tempQuestionImg) {
      wx.showToast({ title: '请填写题目描述或备注', icon: 'none' });
      return;
    }
    
    this.setData({ isAnalyzing: true });
    
    // 构建 Prompt
    // 注意：目前 DeepSeek V3 是纯文本模型，无法直接读取图片。
    // 实际项目中，如果需要分析图片，需要先调用 OCR 接口提取文字，再传给 AI。
    // 这里我们主要依赖用户的文本描述 (tempNotes)。
    let userContent = `请帮我分析这道错题。`;
    if (this.data.tempNotes) {
      userContent += `\n\n题目描述/错误备注：\n${this.data.tempNotes}`;
    } else {
      userContent += `\n\n(用户未提供文字描述，仅上传了图片。请提示用户输入题目文本以便分析)`;
    }

    const systemPrompt = "你是一个专业的错题分析专家。请根据用户提供的题目描述或备注，分析考点、解题思路以及易错点。请分条列出，保持条理清晰。";

    wx.cloud.callFunction({
      name: 'studyPlanAI',
      data: {
        type: 'chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ]
      },
      success: (res) => {
        const result = res.result;
        if (result.success && result.data && result.data.choices) {
          const analysis = result.data.choices[0].message.content;
          this.setData({ tempAiResult: analysis });
          wx.showToast({ title: '分析完成', icon: 'success' });
        } else {
          this.setData({ tempAiResult: "分析失败：AI 服务响应异常" });
        }
      },
      fail: (err) => {
        console.error("AI Analysis Failed", err);
        this.setData({ tempAiResult: "网络请求失败，请稍后重试" });
      },
      complete: () => {
        this.setData({ isAnalyzing: false });
      }
    });
  },

  saveProblem() {
    if (!this.data.tempQuestionImg) {
      wx.showToast({ title: '请至少上传题目图片', icon: 'none' });
      return;
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}`;

    const newProblem = {
      id: Date.now(),
      subject: this.data.currentSubject,
      date: dateStr,
      questionImg: this.data.tempQuestionImg,
      answerImg: this.data.tempAnswerImg,
      notes: this.data.tempNotes,
      aiAnalysis: this.data.tempAiResult,
      expanded: false // 默认折叠
    };

    const newAll = [...this.data.allProblems, newProblem];
    this.setData({ 
      allProblems: newAll,
      isEditing: false
    });
    this.saveData();
    this.updateCurrentList(this.data.currentSubject);
    wx.showToast({ title: '保存成功', icon: 'success' });
  }
});