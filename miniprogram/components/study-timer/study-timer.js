Component({
  properties: {
    // 先定义好 focus 页面需要传入的属性
    initialTime: {
      type: Number,
      value: 0
    },
    subject: {
      type: String,
      value: "学习"
    }
  },
  data: {
    // 组件内部状态
    displayText: "00:00:00",
    running: false,
    elapsed: 0,
    initialSeconds: 0,
    remaining: 0,
    minutesInput: '0',
    pausedElapsed: 0,
    // 学科选项（必要项已包含，另可补充）
    subjects: [
      '语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '体育', '音乐', '美术', '信息技术', '通用技术', '其他'
    ],
    selectedIndex: 0
  },
  observers: {
    'initialTime': function (val) {
      const secs = Number(val) || 0;
      this.setData({ initialSeconds: secs, remaining: secs, elapsed: 0, pausedElapsed: 0, minutesInput: String(Math.max(Math.floor(secs / 60), 0)) });
      this.setData({ displayText: this._formatTime(secs) });
    }
  },
  lifetimes: {
    attached() {
      const secs = Number(this.properties.initialTime) || 0;
      this.setData({ initialSeconds: secs, remaining: secs, minutesInput: String(Math.max(Math.floor(secs / 60), 0)) });
      // 初始化选中学科
      const idx = this.data.subjects.indexOf(this.properties.subject);
      const selIdx = idx >= 0 ? idx : 0;
      const selLabel = this.data.subjects[selIdx];
      this.setData({ selectedIndex: selIdx, subject: selLabel });
      // 通知父页面当前默认学科（方便页面与组件保持同步）
      this.triggerEvent && this.triggerEvent('subjectChange', { subject: selLabel });
      this.setData({ displayText: this._formatTime(secs) });
    },
    detached() {
      if (this._timer) {
        clearInterval(this._timer);
      }
    }
  },
  methods: {
    // 用户在开始前输入分钟数
    onMinutesInput(e) {
      const raw = e.detail.value.replace(/[^0-9]/g, '');
      const mins = Math.max(0, parseInt(raw || '0', 10));
      const secs = mins * 60;
      this.setData({ minutesInput: String(mins), initialSeconds: secs, remaining: secs, elapsed: 0, pausedElapsed: 0 });
      this.setData({ displayText: this._formatTime(secs) });
    },
    // 切换开始/暂停
    toggleTimer() {
      if (this.data.running) {
        this.stopTimer();
      } else {
        this.startTimer();
      }
    },

    startTimer() {
      if (this.data.running) return;
      // 如果初始时长为0，不允许开始
      if (!this.data.initialSeconds || this.data.initialSeconds <= 0) {
        wx.showToast({ title: '请输入大于0的分钟数', icon: 'none' });
        return;
      }
      this.setData({ running: true });
      this._startTs = Date.now();
      // pausedElapsed 表示已经过的秒数（在暂停情况下保留）
      const paused = this.data.pausedElapsed || 0;
      this._timer = setInterval(() => {
        const elapsed = paused + Math.floor((Date.now() - this._startTs) / 1000);
        const remaining = Math.max(this.data.initialSeconds - elapsed, 0);
        this.setData({ elapsed, remaining });
        this.setData({ displayText: this._formatTime(remaining) });
        this.triggerEvent('timeUpdate', { totalSeconds: elapsed });
        if (remaining <= 0) {
          this.stopTimer();
          this.triggerEvent('finish');
        }
      }, 1000);
      // 立即更新一次
      const initialElapsed = this.data.pausedElapsed || 0;
      const initialRemaining = Math.max(this.data.initialSeconds - initialElapsed, 0);
      this.setData({ displayText: this._formatTime(initialRemaining), remaining: initialRemaining });
      this.triggerEvent('timeUpdate', { totalSeconds: initialElapsed });
    },

    stopTimer() {
      if (this._timer) {
        clearInterval(this._timer);
        this._timer = null;
      }
      // 记录已过秒数，方便继续
      const paused = this.data.elapsed || (this.data.initialSeconds - this.data.remaining);
      this.setData({ running: false, pausedElapsed: paused });
    },

    // 外部可以调用 stopTimer 方法
    stopTimerExtern() {
      this.stopTimer();
    },

    // 处理学科选择器变化
    onSubjectPickerChange(e) {
      const idx = Number(e.detail.value) || 0;
      const label = this.data.subjects[idx] || '其他';
      this.setData({ selectedIndex: idx, subject: label });
      this.triggerEvent('subjectChange', { subject: label });
    },

    _formatTime(totalSeconds) {
      const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
      const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
      const s = (totalSeconds % 60).toString().padStart(2, '0');
      return `${h}:${m}:${s}`;
    }
  }
})