Component({
  properties: {
    id: {
      type: Number,
      value: 0
    },
    subject: {
      type: String,
      value: '未命名任务'
    },
    duration: {
      type: Number,
      value: 25
    },
    status: {
      type: String,
      value: 'pending' // 'pending' (待办) or 'done' (已完成)
    }
  },

  methods: {
    onStartTap() {
      // 当按钮被点击时，触发一个名为 'start' 的自定义事件，并携带任务信息
      const item = {
        id: this.data.id,
        subject: this.data.subject,
        duration: this.data.duration,
        status: this.data.status
      };
      console.log('[plan-item] onStartTap, item:', item);
      // 开启 bubbles/composed 以确保事件可以冒泡到父节点并被捕获
      this.triggerEvent('start', { item }, { bubbles: true, composed: true });
    }
  }
})