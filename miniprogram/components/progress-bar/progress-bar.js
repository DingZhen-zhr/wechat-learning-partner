Component({
  properties: {
    percentage: {
      type: Number,
      value: 0,
      observer: function(newVal) {
        // 确保百分比在 0-100 之间
        if (newVal < 0) {
          this.setData({ percentage: 0 });
        }
        if (newVal > 100) {
          this.setData({ percentage: 100 });
        }
      }
    }
  }
})