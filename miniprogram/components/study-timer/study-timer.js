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
    displayText: "00:00:00"
  },
  methods: {
    // 先定义好 focus 页面需要调用的方法（哪怕是空的）
    stopTimer() {
      console.log('计时器被外部调用停止');
    }
  }
})